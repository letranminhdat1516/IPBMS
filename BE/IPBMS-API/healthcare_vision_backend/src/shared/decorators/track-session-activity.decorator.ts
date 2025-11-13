import { SetMetadata } from '@nestjs/common';

export const TRACK_SESSION_ACTIVITY = 'track_session_activity';
export const TrackSessionActivity = () => SetMetadata(TRACK_SESSION_ACTIVITY, true);
