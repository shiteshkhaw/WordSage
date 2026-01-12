import type { NextApiRequest, NextApiResponse } from "next";
/**
 * DELETE /api/teams/[id]
 * Headers: Authorization: Bearer <access_token>
 * - verifies user from token
 * - checks user is owner of team
 * - deletes team_members rows and team row
 */
export default function handler(req: NextApiRequest, res: NextApiResponse): Promise<void>;
//# sourceMappingURL=%5Bid%5D.d.ts.map