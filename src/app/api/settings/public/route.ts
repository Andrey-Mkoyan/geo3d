import { NextResponse } from 'next/server';
import { handle } from '../../../../server/http';
import { getSettings } from '../../../../server/services/settings.service';

export const GET = handle(async () => NextResponse.json(await getSettings()));
