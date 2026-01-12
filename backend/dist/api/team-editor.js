import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
export const teamEditorRouter = Router();
// ====================================
// VERSION HISTORY
// ====================================
// Create a new version
teamEditorRouter.post('/:teamId/documents/:docId/versions', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { teamId, docId } = req.params;
        const { title, content, changeNote } = req.body;
        // Get current max version
        const lastVersion = await prisma.document_versions.findFirst({
            where: { document_id: docId },
            orderBy: { version_num: 'desc' },
        });
        const newVersionNum = (lastVersion?.version_num || 0) + 1;
        const version = await prisma.document_versions.create({
            data: {
                document_id: docId,
                team_id: teamId,
                user_id: req.user.id,
                version_num: newVersionNum,
                title: title || 'Untitled',
                content: content || '',
                change_note: changeNote,
            },
        });
        res.json({ data: version });
    }
    catch (error) {
        console.error('Create version error:', error);
        res.status(500).json({ error: 'Failed to create version' });
    }
});
// List versions
teamEditorRouter.get('/:teamId/documents/:docId/versions', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId } = req.params;
        const versions = await prisma.document_versions.findMany({
            where: { document_id: docId },
            orderBy: { version_num: 'desc' },
            take: 50,
        });
        res.json({ data: versions });
    }
    catch (error) {
        console.error('List versions error:', error);
        res.status(500).json({ error: 'Failed to list versions' });
    }
});
// Get specific version
teamEditorRouter.get('/:teamId/documents/:docId/versions/:versionId', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { versionId } = req.params;
        const version = await prisma.document_versions.findUnique({
            where: { id: versionId },
        });
        if (!version)
            return res.status(404).json({ error: 'Version not found' });
        res.json({ data: version });
    }
    catch (error) {
        console.error('Get version error:', error);
        res.status(500).json({ error: 'Failed to get version' });
    }
});
// ====================================
// COMMENTS & ANNOTATIONS
// ====================================
// List comments
teamEditorRouter.get('/:teamId/documents/:docId/comments', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId } = req.params;
        const comments = await prisma.document_comments.findMany({
            where: { document_id: docId },
            orderBy: { created_at: 'desc' },
        });
        res.json({ data: comments });
    }
    catch (error) {
        console.error('List comments error:', error);
        res.status(500).json({ error: 'Failed to list comments' });
    }
});
// Add comment
teamEditorRouter.post('/:teamId/documents/:docId/comments', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { teamId, docId } = req.params;
        const { content, selection } = req.body;
        const comment = await prisma.document_comments.create({
            data: {
                document_id: docId,
                team_id: teamId,
                user_id: req.user.id,
                user_email: req.user.email || 'unknown',
                user_name: req.user.email?.split('@')[0] || 'User',
                content,
                selection: selection || null,
            },
        });
        res.json({ data: comment });
    }
    catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});
// Resolve/Update comment
teamEditorRouter.put('/:teamId/documents/:docId/comments/:commentId', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { commentId } = req.params;
        const { content, resolved } = req.body;
        const updateData = {};
        if (content !== undefined)
            updateData.content = content;
        if (resolved !== undefined) {
            updateData.resolved = resolved;
            if (resolved) {
                updateData.resolved_by = req.user.id;
                updateData.resolved_at = new Date();
            }
            else {
                updateData.resolved_by = null;
                updateData.resolved_at = null;
            }
        }
        const comment = await prisma.document_comments.update({
            where: { id: commentId },
            data: updateData,
        });
        res.json({ data: comment });
    }
    catch (error) {
        console.error('Update comment error:', error);
        res.status(500).json({ error: 'Failed to update comment' });
    }
});
// Delete comment
teamEditorRouter.delete('/:teamId/documents/:docId/comments/:commentId', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { commentId } = req.params;
        await prisma.document_comments.delete({
            where: { id: commentId },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});
// ====================================
// APPROVAL WORKFLOW
// ====================================
// Get approval status
teamEditorRouter.get('/:teamId/documents/:docId/approval', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId, teamId } = req.params;
        let approval = await prisma.document_approvals.findUnique({
            where: { document_id: docId },
        });
        // Create default if not exists
        if (!approval) {
            approval = await prisma.document_approvals.create({
                data: {
                    document_id: docId,
                    team_id: teamId,
                    status: 'draft',
                },
            });
        }
        res.json({ data: approval });
    }
    catch (error) {
        console.error('Get approval error:', error);
        res.status(500).json({ error: 'Failed to get approval status' });
    }
});
// Submit for review
teamEditorRouter.post('/:teamId/documents/:docId/submit-review', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId, teamId } = req.params;
        const approval = await prisma.document_approvals.upsert({
            where: { document_id: docId },
            create: {
                document_id: docId,
                team_id: teamId,
                status: 'pending_review',
                submitted_by: req.user.id,
                submitted_at: new Date(),
            },
            update: {
                status: 'pending_review',
                submitted_by: req.user.id,
                submitted_at: new Date(),
                reviewed_by: null,
                reviewed_at: null,
                review_note: null,
            },
        });
        res.json({ data: approval, message: 'Submitted for review' });
    }
    catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ error: 'Failed to submit for review' });
    }
});
// Approve document
teamEditorRouter.post('/:teamId/documents/:docId/approve', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId } = req.params;
        const { note } = req.body;
        const approval = await prisma.document_approvals.update({
            where: { document_id: docId },
            data: {
                status: 'approved',
                reviewed_by: req.user.id,
                reviewed_at: new Date(),
                review_note: note || null,
            },
        });
        res.json({ data: approval, message: 'Document approved' });
    }
    catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: 'Failed to approve document' });
    }
});
// Reject document
teamEditorRouter.post('/:teamId/documents/:docId/reject', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId } = req.params;
        const { note } = req.body;
        const approval = await prisma.document_approvals.update({
            where: { document_id: docId },
            data: {
                status: 'rejected',
                reviewed_by: req.user.id,
                reviewed_at: new Date(),
                review_note: note || 'Document rejected',
            },
        });
        res.json({ data: approval, message: 'Document rejected' });
    }
    catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ error: 'Failed to reject document' });
    }
});
// ====================================
// REAL-TIME PRESENCE (Simplified)
// ====================================
// Update presence (heartbeat)
teamEditorRouter.post('/:teamId/documents/:docId/presence', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId, teamId } = req.params;
        const { cursorPos } = req.body;
        await prisma.document_presence.upsert({
            where: {
                document_id_user_id: {
                    document_id: docId,
                    user_id: req.user.id,
                },
            },
            create: {
                document_id: docId,
                team_id: teamId,
                user_id: req.user.id,
                user_email: req.user.email || 'unknown',
                user_name: req.user.email?.split('@')[0] || 'User',
                cursor_pos: cursorPos,
                last_seen: new Date(),
            },
            update: {
                cursor_pos: cursorPos,
                last_seen: new Date(),
            },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Presence update error:', error);
        res.status(500).json({ error: 'Failed to update presence' });
    }
});
// Get active collaborators
teamEditorRouter.get('/:teamId/documents/:docId/presence', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId } = req.params;
        // Get users active in last 30 seconds
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        const activeUsers = await prisma.document_presence.findMany({
            where: {
                document_id: docId,
                last_seen: { gte: thirtySecondsAgo },
            },
            orderBy: { last_seen: 'desc' },
        });
        // Clean up old presence records (older than 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 120000);
        await prisma.document_presence.deleteMany({
            where: {
                document_id: docId,
                last_seen: { lt: twoMinutesAgo },
            },
        });
        res.json({ data: activeUsers });
    }
    catch (error) {
        console.error('Get presence error:', error);
        res.status(500).json({ error: 'Failed to get presence' });
    }
});
// ====================================
// EXPORT DOCUMENT
// ====================================
// Get document for export
teamEditorRouter.get('/:teamId/documents/:docId/export', requireAuth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        const { docId } = req.params;
        const format = req.query.format || 'html';
        // Get document
        const doc = await prisma.documents.findUnique({
            where: { id: docId },
        });
        if (!doc)
            return res.status(404).json({ error: 'Document not found' });
        // Get approval status
        const approval = await prisma.document_approvals.findUnique({
            where: { document_id: docId },
        });
        res.json({
            data: {
                id: doc.id,
                title: doc.title,
                content: doc.content,
                format,
                status: approval?.status || 'draft',
                exportedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export document' });
    }
});
//# sourceMappingURL=team-editor.js.map