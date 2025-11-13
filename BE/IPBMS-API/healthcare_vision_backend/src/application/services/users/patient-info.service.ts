import { Injectable, Logger } from '@nestjs/common';
import { EmergencyContactsRepository } from '../../../infrastructure/repositories/users/emergency-contacts.repository';
import { PatientHabitsRepository } from '../../../infrastructure/repositories/users/patient-habits.repository';
import { PatientMedicalRecordsRepository } from '../../../infrastructure/repositories/users/patient-medical-records.repository';
import { PatientSupplementsRepository } from '../../../infrastructure/repositories/users/patient-supplements.repository';
import { MedicalInfoUpsertDto } from '../../dto/patient-info/medical-info.dto';
import { HabitItemDto } from '../../dto/patient-info/patient-habits.dto';

@Injectable()
export class PatientInfoService {
  private readonly logger = new Logger(PatientInfoService.name);
  constructor(
    private readonly supp: PatientSupplementsRepository,
    private readonly rec: PatientMedicalRecordsRepository,
    private readonly contacts: EmergencyContactsRepository,
    private readonly habits: PatientHabitsRepository,
  ) {}

  // Add habit
  async addHabit(customer_id: string, habit: HabitItemDto) {
    // ensure time fields are normalized (repository expects Date | null)
    const payload = {
      ...habit,
      sleep_start: habit.sleep_start ? this.parseTimeToUTCDate(habit.sleep_start) : undefined,
      sleep_end: habit.sleep_end ? this.parseTimeToUTCDate(habit.sleep_end) : undefined,
    } as any;
    return this.habits.upsert(customer_id, payload);
  }

  // Update habit
  async updateHabit(customer_id: string, habit_id: string, habit: HabitItemDto) {
    const payload = {
      ...habit,
      habit_id,
      sleep_start: habit.sleep_start ? this.parseTimeToUTCDate(habit.sleep_start) : undefined,
      sleep_end: habit.sleep_end ? this.parseTimeToUTCDate(habit.sleep_end) : undefined,
    } as any;
    return this.habits.upsert(customer_id, payload);
  }

  // Delete habit
  async removeHabit(customer_id: string, habit_id: string) {
    await this.habits.remove(customer_id, habit_id);
    return { deleted: true };
  }

  async getComposite(customer_id?: string, fallbackName?: string) {
    if (!customer_id) return { patient: null, record: null, contacts: [], habits: [] };
    try {
      const s = await this.supp.findByCustomerId(customer_id);
      if (!s) return { patient: null, record: null, contacts: [], habits: [] };

      const [r, c, h] = await Promise.all([
        this.rec.findBySupplementId(s.id),
        this.contacts.listByUserId(customer_id),
        this.habits.listBySupplementId(s.id),
      ]);

      const patient = s
        ? { id: s.id, name: s.name ?? fallbackName ?? 'N/A', dob: s.dob ?? null }
        : null;

      const record = r
        ? {
            name: (r as any).name ?? null,
            notes: (r as any).notes ?? null,
            history: Array.isArray((r as any).history) ? (r as any).history : [],
          }
        : null;

      const contacts = c.map((x) => ({
        name: x.name,
        relation: x.relation,
        phone: x.phone,
        alert_level: x.alert_level,
      }));

      const habits = (h ?? []).map((x) => ({
        habit_id: x.habit_id,
        habit_type: x.habit_type,
        habit_name: x.habit_name,
        description: x.description ?? null,
        sleep_start: (x as any).sleep_start ? this.timeToHHMMSS((x as any).sleep_start) : null,
        sleep_end: (x as any).sleep_end ? this.timeToHHMMSS((x as any).sleep_end) : null,
        frequency: x.frequency,
        days_of_week: x.days_of_week ?? null,
        notes: x.notes ?? null,
        is_active: x.is_active,
        created_at: x.created_at ?? null,
        updated_at: x.updated_at ?? null,
      }));

      return { patient, record, contacts, habits };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const trace = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `[getComposite] Error while fetching composite info for ${customer_id}: ${message}`,
        trace,
      );
      throw err;
    }
  }

  async upsert(body: MedicalInfoUpsertDto): Promise<any> {
    const p = body?.patient ?? {};
    const r = body?.record ?? {};
    const hs: HabitItemDto[] = Array.isArray(body?.habits) ? (body.habits as HabitItemDto[]) : [];
    const customer_id = body?.customer_id;

    if (p && (p.name !== undefined || p.dob !== undefined) && customer_id) {
      const dobValue = this.normalizeDob(p.dob);

      await this.supp.upsert(customer_id, {
        ...(p.name !== undefined ? { name: p.name } : {}),
        ...(p.dob !== undefined ? { dob: dobValue } : {}),
      });
    }

    let supplement = null;
    if (
      r &&
      (r.name !== undefined || r.notes !== undefined || r.history !== undefined || hs.length) &&
      customer_id
    ) {
      supplement = await this.supp.findByCustomerId(customer_id);
    }

    if (r && supplement) {
      await this.rec.upsert(supplement.id, {
        ...(r.name !== undefined ? { name: r.name } : {}),
        ...(r.notes !== undefined ? { notes: r.notes } : {}),
        ...(r.history !== undefined ? { history: Array.isArray(r.history) ? r.history : [] } : {}),
      });
    }

    if (hs.length && supplement) {
      await Promise.all(
        hs.map((item) =>
          this.habits.upsert(supplement.id, {
            habit_id: item?.habit_id,
            habit_type: item?.habit_type,
            habit_name: item?.habit_name,
            description: item?.description,
            sleep_start: item?.sleep_start ? this.parseTimeToUTCDate(item.sleep_start) : undefined,
            sleep_end: item?.sleep_end ? this.parseTimeToUTCDate(item.sleep_end) : undefined,
            frequency: item?.frequency,
            days_of_week: Array.isArray(item?.days_of_week) ? item.days_of_week : undefined,
            notes: item?.notes,
            is_active: item?.is_active,
          }),
        ),
      );
    }

    return this.getComposite(customer_id);
  }

  // Contacts
  async listContacts(customer_id: string) {
    return this.contacts.listByUserId(customer_id);
  }

  async createContact(
    customer_id: string,
    data: { name: string; relation: string; phone: string; alert_level?: number },
  ) {
    return this.contacts.create(customer_id, {
      name: data.name,
      relation: data.relation,
      phone: data.phone,
      alert_level: data.alert_level ?? 1,
    });
  }

  async updateContact(
    customer_id: string,
    contactId: string,
    data: { name?: string; relation?: string; phone?: string; alert_level?: number },
  ) {
    return this.contacts.update(contactId, customer_id, data);
  }

  async removeContact(customer_id: string, contactId: string) {
    await this.contacts.softDeleteContact(contactId, customer_id);
    return { deleted: true };
  }

  async listHabits(customer_id: string) {
    const s = await this.supp.findByCustomerId(customer_id);
    if (!s) return [];
    return this.habits.listBySupplementId(s.id);
  }

  async getAvatar(_customer_id: string) {
    // avatar not supported
    return { avatarUrl: null };
  }

  private timeToHHMMSS(d: any): string | null {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    const hh = String(dt.getUTCHours()).padStart(2, '0');
    const mm = String(dt.getUTCMinutes()).padStart(2, '0');
    const ss = String(dt.getUTCSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private normalizeDob(dob: any): Date | null | undefined {
    if (dob === undefined) return undefined;
    if (dob === null) return null;
    if (dob instanceof Date) return dob;
    if (typeof dob === 'string') {
      // allow 'YYYY-MM-DD' or full ISO
      const parsed = new Date(dob);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  }

  private parseTimeToUTCDate(time?: any): Date | null | undefined {
    if (time === undefined) return undefined;
    if (time === null) return null;
    if (time instanceof Date) return time;
    const s = String(time);
    // accept 'HH:mm' or 'HH:mm:ss' and anchor to 1970-01-01 UTC
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
      const parts = s.split(':').map((p) => Number(p));
      const hh = parts[0] || 0;
      const mm = parts[1] || 0;
      const ss = parts[2] || 0;
      return new Date(Date.UTC(1970, 0, 1, hh, mm, ss));
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? undefined : dt;
  }
}
