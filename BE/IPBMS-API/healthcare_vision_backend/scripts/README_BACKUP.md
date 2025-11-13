# Postgres backup helper

This repository includes a small helper script to create a Postgres dump into the `backups/` folder.

Script

- `scripts/backup_db.sh` - wrapper around `pg_dump`.

Usage

- Using a connection string (recommended):

  ```bash
  DATABASE_URL="postgres://user:password@host:5432/dbname" ./scripts/backup_db.sh
  ```

- Using environment variables:

  ```bash
  PGHOST=host PGUSER=user PGPASSWORD=pass PGDATABASE=dbname ./scripts/backup_db.sh
  ```

Output

- Dumps are saved to `backups/backup-<UTC_TIMESTAMP>.dump` in Postgres custom format (`-Fc`).

Restore

- To restore the custom-format dump to a database:

  ```bash
  pg_restore -h host -U user -d target_db -c backups/backup-20251031_120304.dump
  ```

Notes

- The script requires `pg_dump`/`pg_restore` available in PATH.
- For production backups consider:
  - running from a bastion or CI runner with network access to the DB
  - storing backups in a durable object store (S3) and encrypting them
  - rotating old backups
