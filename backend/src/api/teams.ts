import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import { sendTeamInviteEmail } from '../emails/sendInviteEmail.js';
import prisma from '../lib/prisma.js';

export const teamsRouter = Router();

// Health check
teamsRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', route: 'teams' });
});

// POST /api/teams - Create new team
teamsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 POST /api/teams - Request received');

  try {
    if (!req.user) {
      console.log('❌ Unauthorized - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;
    console.log('📝 Team name:', name);
    console.log('👤 User ID:', req.user.id);

    if (!name || !name.trim()) {
      console.log('❌ Team name is required');
      return res.status(400).json({ error: 'Team name is required' });
    }

    console.log('🔄 Creating team in database...');

    // Create team
    const team = await prisma.teams.create({
      data: {
        name: name.trim(),
        owner_id: req.user.id,
        subscription_tier: 'teams',
        max_members: 50,
      },
    });

    console.log('✅ Team created:', team);

    // Create default style guide (non-blocking)
    prisma.team_style_guides.create({
      data: {
        team_id: team.id,
        brand_voice: 'professional',
        tone: 'friendly',
        approved_terms: [],
        forbidden_terms: [],
        custom_rules: {
          writing_style: 'Clear and concise',
          sentence_length: 'Medium (15-20 words average)',
          paragraph_structure: '3-5 sentences per paragraph',
          formatting_preferences: 'Active voice preferred',
          industry_jargon: [],
          target_audience: 'General business audience',
        },
        updated_by: req.user.id,
      },
    })
      .then(() => console.log('✅ Style guide created'))
      .catch((err: any) => console.log('⚠️ Style guide error:', err.message));

    return res.json({
      success: true,
      team,
    });

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create team',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/teams - Get user's teams
teamsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 GET /api/teams - Fetching teams for user:', req.user?.id);

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get owned teams
    const ownedTeams = await prisma.teams.findMany({
      where: { owner_id: req.user.id },
    });

    // Get teams where user is a member
    const memberTeams = await prisma.team_members.findMany({
      where: {
        user_id: req.user.id,
        status: 'active',
      },
      include: {
        team: true,
      },
    });

    const teams = [
      ...(ownedTeams || []).map((t: any) => ({ ...t, role: 'owner' })),
      ...(memberTeams?.map((mt: any) => ({ ...mt.team, role: mt.role })) || []),
    ];

    console.log('✅ Found', teams.length, 'teams');
    res.json({ teams });

  } catch (error: any) {
    console.error('❌ Get teams error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch teams' });
  }
});

// GET /api/teams/invites - Get pending invitations for current user
// ⚠️ IMPORTANT: This route MUST come before /:teamId routes!
teamsRouter.get('/invites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 GET /api/teams/invites - Fetching pending invites for user:', req.user?.id);

  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const invites = await prisma.team_members.findMany({
      where: {
        user_id: req.user.id,
        status: 'pending',
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        invited_at: 'desc',
      },
    });

    // Map to include team info at top level for frontend
    const formattedInvites = invites.map(inv => ({
      id: inv.id,
      team_id: inv.team_id,
      user_id: inv.user_id,
      status: inv.status,
      invited_at: inv.invited_at,
      teams: inv.team ? { name: inv.team.name } : null,
    }));

    console.log(`✅ Found ${formattedInvites.length} pending invites`);
    res.json({ data: formattedInvites });
  } catch (error: any) {
    console.error('❌ Get invites error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// GET /api/teams/:teamId - Get single team details
teamsRouter.get('/:teamId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 GET /api/teams/:teamId - Fetching team details');

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId } = req.params;

    // Get team
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Determine user's role
    let userRole = 'none';
    if (team.owner_id === req.user.id) {
      userRole = 'owner';
    } else {
      const membership = await prisma.team_members.findFirst({
        where: {
          team_id: teamId,
          user_id: req.user.id,
          status: 'active',
        },
      });
      if (membership) {
        userRole = membership.role;
      }
    }

    // Check access
    if (userRole === 'none') {
      return res.status(403).json({ error: 'You do not have access to this team' });
    }

    // Get members with profiles
    const members = await prisma.team_members.findMany({
      where: {
        team_id: teamId,
        status: 'active',
      },
      include: {
        user: {
          select: {
            email: true,
            full_name: true,
            user_profiles: {
              select: {
                total_ai_requests: true,
                words_processed: true,
              },
            },
          },
        },
      },
    });

    // Format members for frontend
    const formattedMembers = members.map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      profile: {
        email: m.user?.email || 'Unknown',
        total_ai_requests: m.user?.user_profiles?.total_ai_requests || 0,
        words_processed: m.user?.user_profiles?.words_processed || 0,
      },
    }));

    // Add owner to members if not already there
    const ownerInMembers = formattedMembers.find((m: any) => m.user_id === team.owner_id);
    if (!ownerInMembers) {
      const owner = await prisma.users.findUnique({
        where: { id: team.owner_id },
        include: {
          user_profiles: {
            select: {
              total_ai_requests: true,
              words_processed: true,
            },
          },
        },
      });
      if (owner) {
        formattedMembers.unshift({
          id: 'owner',
          user_id: team.owner_id,
          role: 'owner',
          status: 'active',
          joined_at: team.created_at,
          profile: {
            email: owner.email,
            total_ai_requests: owner.user_profiles?.total_ai_requests || 0,
            words_processed: owner.user_profiles?.words_processed || 0,
          },
        });
      }
    }

    // Get content library
    const contentLibrary = await prisma.team_content_library.findMany({
      where: { team_id: teamId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    console.log('✅ Team data fetched successfully');
    res.json({
      data: {
        team,
        userRole,
        members: formattedMembers,
        contentLibrary,
      },
    });

  } catch (error: any) {
    console.error('❌ Get team error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch team' });
  }
});

// POST /api/teams/:teamId/invite - Invite team member (creates PENDING invitation)
teamsRouter.post('/:teamId/invite', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 POST /api/teams/:teamId/invite - Inviting member');

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId } = req.params;
    const { email } = req.body;

    console.log(`📧 Inviting ${email} to team ${teamId}`);

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check team + permissions
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    console.log('✅ Team found:', team.name);

    if (team.owner_id !== req.user.id) {
      const member = await prisma.team_members.findFirst({
        where: {
          team_id: teamId,
          user_id: req.user.id,
        },
        select: { role: true },
      });

      if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
        return res.status(403).json({ error: 'Only owners and admins can invite members' });
      }
    }

    // Look up invited user
    const normalizedEmail = email.trim().toLowerCase();

    const invitedUser = await prisma.users.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, full_name: true },
    });

    if (!invitedUser) {
      console.log('❌ User not found:', email);
      return res.status(404).json({
        error: 'User not found with that email. They need to sign up first.'
      });
    }

    console.log('✅ User found:', invitedUser.email);

    // Check if already invited or member
    const existingMember = await prisma.team_members.findMany({
      where: {
        team_id: teamId,
        user_id: invitedUser.id,
      },
    });

    if (existingMember && existingMember.length > 0) {
      const member = existingMember[0];
      if (member.status === 'active') {
        return res.status(400).json({ error: 'User is already a team member' });
      }
      if (member.status === 'pending') {
        return res.status(400).json({ error: 'User already has a pending invitation' });
      }
    }

    // Create PENDING invite
    const newMember = await prisma.team_members.create({
      data: {
        team_id: teamId,
        user_id: invitedUser.id,
        role: 'member',
        status: 'pending',
        invited_at: new Date(),
      },
    });

    console.log(`✅ Invitation sent: ${email} → ${team.name} (PENDING)`);

    // Build accept/reject URLs
    const base = process.env.FRONTEND_URL!;
    const acceptUrl = `${base}/dashboard/teams/${teamId}/accept?inv=${newMember.id}`;
    const rejectUrl = `${base}/dashboard/teams/${teamId}/reject?inv=${newMember.id}`;

    // Fetch inviter profile for email
    const inviterProfile = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { full_name: true, email: true },
    });

    // Send invite email
    try {
      await sendTeamInviteEmail(
        invitedUser.email,
        inviterProfile?.full_name || inviterProfile?.email || "A teammate",
        team.name,
        acceptUrl,
        rejectUrl
      );
      console.log("✅ Invitation email sent to", invitedUser.email);
    } catch (err: any) {
      console.error("❌ Failed to send invite email:", err.message);
    }

    return res.json({
      success: true,
      member: newMember,
      message: `Invitation sent to ${email}. They must accept to join the team.`
    });

  } catch (error: any) {
    console.error('❌ Invite member error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send invitation' });
  }
});

// POST /api/teams/:teamId/accept - Accept invite
teamsRouter.post('/:teamId/accept', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 POST /api/teams/:teamId/accept - Accepting invitation');

  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { teamId } = req.params;

    const invitation = await prisma.team_members.findFirst({
      where: {
        team_id: teamId,
        user_id: req.user.id,
        status: 'pending',
      },
    });

    if (!invitation) return res.status(404).json({ error: 'No pending invitation found' });

    await prisma.team_members.update({
      where: { id: invitation.id },
      data: {
        status: 'active',
        joined_at: new Date(),
      },
    });

    console.log(`✅ Invitation accepted: User ${req.user.id} joined team ${teamId}`);
    res.json({ success: true, message: 'Successfully joined the team!' });

  } catch (error: any) {
    console.error('❌ Accept invitation error:', error);
    res.status(500).json({ error: error.message || 'Failed to accept invitation' });
  }
});

// POST /api/teams/:teamId/reject - Reject invite
teamsRouter.post('/:teamId/reject', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 POST /api/teams/:teamId/reject - Rejecting invitation');

  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { teamId } = req.params;

    await prisma.team_members.deleteMany({
      where: {
        team_id: teamId,
        user_id: req.user.id,
        status: 'pending',
      },
    });

    console.log(`✅ Invitation rejected: User ${req.user.id} declined team ${teamId}`);
    res.json({ success: true, message: 'Invitation declined' });

  } catch (error: any) {
    console.error('❌ Reject invitation error:', error);
    res.status(500).json({ error: error.message || 'Failed to reject invitation' });
  }
});

// GET /api/teams/:teamId/members
teamsRouter.get('/:teamId/members', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 GET /api/teams/:teamId/members');

  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { teamId } = req.params;

    // Get team to find owner
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
      select: {
        owner_id: true,
        owner: {
          select: {
            id: true,
            email: true,
            full_name: true,
          },
        },
      },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Get all members (both active and pending)
    const members = await prisma.team_members.findMany({
      where: {
        team_id: teamId,
      },
      include: {
        user: {
          select: {
            email: true,
            full_name: true,
            user_profiles: {
              select: {
                total_ai_requests: true,
                words_processed: true,
              },
            },
          },
        },
      },
    });

    // Format members with user_profiles at top level for frontend
    const formattedMembers = members.map(m => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      invited_at: m.invited_at,
      user_profiles: m.user ? {
        email: m.user.email,
        full_name: m.user.full_name,
      } : null,
    }));

    // Add owner as a special member if not already in the list
    const ownerInList = formattedMembers.some(m => m.user_id === team.owner_id);
    if (!ownerInList && team.owner) {
      formattedMembers.unshift({
        id: 'owner-' + team.owner_id,
        user_id: team.owner_id,
        role: 'owner' as any,
        status: 'active',
        invited_at: null as any,
        user_profiles: {
          email: team.owner.email,
          full_name: team.owner.full_name,
        },
      });
    }

    console.log('✅ Found', formattedMembers?.length || 0, 'members');
    res.json({ data: formattedMembers });

  } catch (error: any) {
    console.error('❌ Get members error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch members' });
  }
});

// PUT /api/teams/:teamId/style-guide - Update style guide
teamsRouter.put('/:teamId/style-guide', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 PUT /api/teams/:teamId/style-guide');

  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { teamId } = req.params;
    const { brand_voice, tone, approved_terms, forbidden_terms, custom_rules } = req.body;

    const team = await prisma.teams.findUnique({
      where: { id: teamId },
      select: { owner_id: true },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.owner_id !== req.user.id) {
      const member = await prisma.team_members.findFirst({
        where: {
          team_id: teamId,
          user_id: req.user.id,
        },
        select: { role: true },
      });

      if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
        return res.status(403).json({ error: 'Only owners and admins can update style guide' });
      }
    }

    const styleGuide = await prisma.team_style_guides.updateMany({
      where: { team_id: teamId },
      data: {
        brand_voice,
        tone,
        approved_terms,
        forbidden_terms,
        custom_rules,
        updated_by: req.user.id,
      },
    });

    console.log('✅ Style guide updated');
    res.json({ success: true, styleGuide });

  } catch (error: any) {
    console.error('❌ Update style guide error:', error);
    res.status(500).json({ error: error.message || 'Failed to update style guide' });
  }
});

// GET /api/teams/:teamId/content-library
teamsRouter.get('/:teamId/content-library', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 GET /api/teams/:teamId/content-library');

  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { teamId } = req.params;

    const content = await prisma.team_content_library.findMany({
      where: { team_id: teamId },
      include: {
        creator: {
          select: { email: true },
        },
        approver: {
          select: { email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    console.log('✅ Found', content?.length || 0, 'content items');
    res.json({ content });

  } catch (error: any) {
    console.error('❌ Get content library error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch content library' });
  }
});

// DELETE /api/teams/:teamId - Delete team (owner only)
teamsRouter.delete('/:teamId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const userId = req.user?.id;

    const team = await prisma.teams.findUnique({
      where: { id: teamId },
      select: { owner_id: true },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.owner_id !== userId) return res.status(403).json({ error: 'Only owner can delete team' });

    // Delete related data (cascading will handle most, but being explicit)
    await prisma.team_members.deleteMany({ where: { team_id: teamId } });
    await prisma.team_content_library.deleteMany({ where: { team_id: teamId } });
    await prisma.team_style_guides.deleteMany({ where: { team_id: teamId } });

    await prisma.teams.delete({
      where: { id: teamId },
    });

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (error: any) {
    console.error('❌ Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete team' });
  }
});

// GET /api/teams/invites - Get pending invitations for current user
teamsRouter.get('/invites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invites = await prisma.team_members.findMany({
      where: {
        user_id: req.user!.id,
        status: 'pending',
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        invited_at: 'desc',
      },
    });

    res.json({ data: invites });
  } catch (error: any) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// POST /api/teams/:id/accept - Accept team invitation
teamsRouter.post('/:id/accept', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamId = req.params.id;

    // Find pending invitation
    const member = await prisma.team_members.findFirst({
      where: {
        team_id: teamId,
        user_id: req.user!.id,
        status: 'pending',
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Accept invitation
    await prisma.team_members.update({
      where: { id: member.id },
      data: {
        status: 'active',
        joined_at: new Date(),
      },
    });

    res.json({ success: true, message: 'Invitation accepted' });
  } catch (error: any) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// POST /api/teams/:id/reject - Reject team invitation
teamsRouter.post('/:id/reject', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamId = req.params.id;

    // Find and delete pending invitation
    const member = await prisma.team_members.findFirst({
      where: {
        team_id: teamId,
        user_id: req.user!.id,
        status: 'pending',
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    await prisma.team_members.delete({
      where: { id: member.id },
    });

    res.json({ success: true, message: 'Invitation rejected' });
  } catch (error: any) {
    console.error('Reject invite error:', error);
    res.status(500).json({ error: 'Failed to reject invitation' });
  }
});

// PATCH /api/teams/:teamId/members/:memberId/role - Change role
teamsRouter.patch('/:teamId/members/:memberId/role', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user?.id;

    if (role !== 'admin' && role !== 'member') return res.status(400).json({ error: 'Invalid role requested' });

    const requester = await prisma.team_members.findFirst({
      where: {
        team_id: teamId,
        user_id: userId,
      },
      select: { role: true },
    });

    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      return res.status(403).json({ error: 'Only owner or admin can change roles' });
    }

    await prisma.team_members.update({
      where: { id: memberId },
      data: { role },
    });

    res.json({ success: true, message: `Role changed to ${role}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/teams/:teamId/members/:memberId - Remove member from team (kick)
teamsRouter.delete('/:teamId/members/:memberId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log('🔵 DELETE /api/teams/:teamId/members/:memberId - Kicking member');

  try {
    const { teamId, memberId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get the team to check ownership
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
      select: { owner_id: true },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Get the member to be kicked
    const memberToKick = await prisma.team_members.findUnique({
      where: { id: memberId },
      select: { user_id: true, role: true },
    });

    if (!memberToKick) return res.status(404).json({ error: 'Member not found' });

    // Check if user is trying to kick the owner (not allowed)
    if (memberToKick.user_id === team.owner_id) {
      return res.status(403).json({ error: 'Cannot remove the team owner' });
    }

    // Check if requester has permission (must be owner or admin)
    const isOwner = userId === team.owner_id;
    if (!isOwner) {
      const requesterMembership = await prisma.team_members.findFirst({
        where: {
          team_id: teamId,
          user_id: userId,
          status: 'active',
        },
        select: { role: true },
      });

      if (!requesterMembership || requesterMembership.role !== 'admin') {
        return res.status(403).json({ error: 'Only owner or admin can remove members' });
      }
    }

    // Delete the member
    await prisma.team_members.delete({
      where: { id: memberId },
    });

    console.log(`✅ Member ${memberId} removed from team ${teamId}`);
    res.json({ success: true, message: 'Member removed from team' });
  } catch (error: any) {
    console.error('❌ Remove member error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove member' });
  }
});

// PATCH /api/teams/:teamId/members/:memberId/ownership - Transfer ownership
teamsRouter.patch('/:teamId/members/:memberId/ownership', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = req.user?.id;

    const team = await prisma.teams.findUnique({
      where: { id: teamId },
      select: { owner_id: true },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.owner_id !== userId) return res.status(403).json({ error: 'Only current owner can transfer ownership' });

    // Get the new owner's user_id from team_members
    const newOwnerMember = await prisma.team_members.findUnique({
      where: { id: memberId },
      select: { user_id: true },
    });

    if (!newOwnerMember) return res.status(404).json({ error: 'Member not found' });

    // Update old owner to member
    await prisma.team_members.updateMany({
      where: {
        team_id: teamId,
        user_id: userId,
      },
      data: { role: 'member' },
    });

    // Update new owner to owner role
    await prisma.team_members.update({
      where: { id: memberId },
      data: { role: 'owner' },
    });

    // Update team owner_id
    await prisma.teams.update({
      where: { id: teamId },
      data: { owner_id: newOwnerMember.user_id },
    });

    res.json({ success: true, message: 'Ownership transferred successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

// GET /api/teams/check-user/:email - Check if user exists
teamsRouter.get('/check-user/:email', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.params;
    console.log('🔍 [CHECK-USER] Checking if user exists:', email);

    const user = await prisma.users.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: 'insensitive',
        },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log('❌ [CHECK-USER] User not found:', email);
      return res.json({
        exists: false,
        email,
        message: 'User not found in system'
      });
    }

    console.log('✅ [CHECK-USER] User found:', user.email);
    return res.json({
      exists: true,
      email: user.email,
      userId: user.id
    });
  } catch (error: any) {
    console.error('❌ [CHECK-USER] Error:', error.message);
    return res.status(500).json({
      error: 'Failed to check user existence',
      details: error.message
    });
  }
});

// GET /api/teams/:teamId/role - Get user's role in team
teamsRouter.get('/:teamId/role', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId } = req.params;

    const team = await prisma.teams.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let role = 'none';
    if (team.owner_id === req.user.id) {
      role = 'owner';
    } else {
      const membership = await prisma.team_members.findFirst({
        where: {
          team_id: teamId,
          user_id: req.user.id,
          status: 'active',
        },
      });
      if (membership) {
        role = membership.role;
      }
    }

    res.json({ data: { role } });
  } catch (error: any) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to get role' });
  }
});

// GET /api/teams/:teamId/content - Get content library
teamsRouter.get('/:teamId/content', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId } = req.params;

    const content = await prisma.team_content_library.findMany({
      where: { team_id: teamId },
      orderBy: { created_at: 'desc' },
      include: {
        creator: {
          select: { email: true },
        },
        approver: {
          select: { email: true },
        },
      },
    });

    const formattedContent = content.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category || 'General',
      tags: item.tags || [],
      usage_count: item.usage_count,
      approved: item.approved,
      created_at: item.created_at,
      created_by: item.created_by,
      approved_by: item.approved_by,
      creator_email: item.creator?.email,
      approver_email: item.approver?.email,
    }));

    res.json({ data: formattedContent });
  } catch (error: any) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// POST /api/teams/:teamId/content - Add content to library
teamsRouter.post('/:teamId/content', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId } = req.params;
    const { title, content, category, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newContent = await prisma.team_content_library.create({
      data: {
        team_id: teamId,
        created_by: req.user.id,
        title,
        content,
        category: category || 'General',
        tags: tags || [],
        usage_count: 0,
        approved: false,
      },
    });

    res.json({ data: newContent, success: true });
  } catch (error: any) {
    console.error('Add content error:', error);
    res.status(500).json({ error: 'Failed to add content' });
  }
});

// PUT /api/teams/:teamId/content/:itemId - Update content (e.g., approve)
teamsRouter.put('/:teamId/content/:itemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId, itemId } = req.params;
    const { approved, title, content, category, tags } = req.body;

    const updateData: any = {};
    if (approved !== undefined) {
      updateData.approved = approved;
      updateData.approved_by = req.user.id;
    }
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags;

    const updated = await prisma.team_content_library.update({
      where: { id: itemId },
      data: updateData,
    });

    res.json({ data: updated, success: true });
  } catch (error: any) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// DELETE /api/teams/:teamId/content/:itemId - Delete content
teamsRouter.delete('/:teamId/content/:itemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { itemId } = req.params;

    await prisma.team_content_library.delete({
      where: { id: itemId },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// POST /api/teams/:teamId/content/:itemId/use - Increment usage count
teamsRouter.post('/:teamId/content/:itemId/use', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;

    await prisma.team_content_library.update({
      where: { id: itemId },
      data: {
        usage_count: { increment: 1 },
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Use content error:', error);
    res.status(500).json({ error: 'Failed to update usage count' });
  }
});

// GET /api/teams/:teamId/style-guide - Get team style guide
teamsRouter.get('/:teamId/style-guide', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId } = req.params;

    // Get team to check access
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Determine user role
    let userRole = 'none';
    if (team.owner_id === req.user.id) {
      userRole = 'owner';
    } else {
      const membership = await prisma.team_members.findFirst({
        where: {
          team_id: teamId,
          user_id: req.user.id,
          status: 'active',
        },
      });
      if (membership) {
        userRole = membership.role;
      }
    }

    if (userRole === 'none') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get style guide
    let styleGuide = await prisma.team_style_guides.findFirst({
      where: { team_id: teamId },
      include: {
        updater: {
          select: { email: true },
        },
      },
    });

    // Create default if not exists
    if (!styleGuide) {
      styleGuide = await prisma.team_style_guides.create({
        data: {
          team_id: teamId,
          brand_voice: 'professional',
          tone: 'formal',
          approved_terms: [],
          forbidden_terms: [],
          custom_rules: {},
          updated_by: req.user.id,
        },
        include: {
          updater: {
            select: { email: true },
          },
        },
      });
    }

    res.json({
      data: {
        styleGuide: {
          ...styleGuide,
          updater_email: (styleGuide as any).updater?.email,
        },
        userRole,
      },
    });
  } catch (error: any) {
    console.error('Get style guide error:', error);
    res.status(500).json({ error: 'Failed to get style guide' });
  }
});

// PUT /api/teams/:teamId/style-guide - Update team style guide
teamsRouter.put('/:teamId/style-guide', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teamId } = req.params;
    const { brand_voice, tone, approved_terms, forbidden_terms, custom_rules } = req.body;

    // Check user has permission
    const team = await prisma.teams.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let canEdit = team.owner_id === req.user.id;
    if (!canEdit) {
      const membership = await prisma.team_members.findFirst({
        where: {
          team_id: teamId,
          user_id: req.user.id,
          status: 'active',
          role: 'admin',
        },
      });
      canEdit = !!membership;
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'Only owners and admins can edit the style guide' });
    }

    // Update or create style guide
    const existingGuide = await prisma.team_style_guides.findFirst({
      where: { team_id: teamId },
    });

    let updated;
    if (existingGuide) {
      updated = await prisma.team_style_guides.update({
        where: { id: existingGuide.id },
        data: {
          brand_voice,
          tone,
          approved_terms,
          forbidden_terms,
          custom_rules,
          updated_by: req.user.id,
        },
      });
    } else {
      updated = await prisma.team_style_guides.create({
        data: {
          team_id: teamId,
          brand_voice,
          tone,
          approved_terms: approved_terms || [],
          forbidden_terms: forbidden_terms || [],
          custom_rules: custom_rules || {},
          updated_by: req.user.id,
        },
      });
    }

    res.json({ data: updated, success: true });
  } catch (error: any) {
    console.error('Update style guide error:', error);
    res.status(500).json({ error: 'Failed to update style guide' });
  }
});