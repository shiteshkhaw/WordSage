import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
/**
 * DELETE /api/teams/[id]
 * Headers: Authorization: Bearer <access_token>
 * - verifies user from token
 * - checks user is owner of team
 * - deletes team_members rows and team row
 */
export default async function handler(req, res) {
    if (req.method !== "DELETE") {
        res.setHeader("Allow", "DELETE");
        return res.status(405).json({ error: "Method not allowed" });
    }
    try {
        const tokenHeader = req.headers.authorization || "";
        const token = tokenHeader.startsWith("Bearer ") ? tokenHeader.split(" ")[1] : tokenHeader;
        if (!token)
            return res.status(401).json({ error: "Missing authorization token" });
        // Validate token & get user
        const { data: { user }, error: userErr, } = await supabase.auth.getUser(token);
        if (userErr || !user) {
            console.error("auth.getUser error:", userErr);
            return res.status(401).json({ error: "Invalid token" });
        }
        const teamId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
        if (!teamId)
            return res.status(400).json({ error: "Missing team id" });
        // Fetch team
        const { data: teamData, error: teamErr } = await supabase
            .from("teams")
            .select("id, owner_id")
            .eq("id", teamId)
            .single();
        if (teamErr || !teamData) {
            console.error("team fetch error:", teamErr);
            return res.status(404).json({ error: "Team not found" });
        }
        // Only owner can delete
        if (teamData.owner_id !== user.id) {
            return res.status(403).json({ error: "Only the team owner can delete this team" });
        }
        // Delete team_members first
        const { error: delMembersErr } = await supabase
            .from("team_members")
            .delete()
            .eq("team_id", teamId);
        if (delMembersErr) {
            console.error("delete team_members error:", delMembersErr);
            return res.status(500).json({ error: "Failed to delete team members" });
        }
        // Delete the team
        const { error: delTeamErr } = await supabase
            .from("teams")
            .delete()
            .eq("id", teamId);
        if (delTeamErr) {
            console.error("delete team error:", delTeamErr);
            return res.status(500).json({ error: "Failed to delete team" });
        }
        return res.status(200).json({ success: true });
    }
    catch (err) {
        console.error("Unexpected error in delete team API:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
//# sourceMappingURL=%5Bid%5D.js.map