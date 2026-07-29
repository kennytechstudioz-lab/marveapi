import NotificationTemplate from '../models/NotificationTemplate';

const DEFAULT_TEMPLATES: Record<string, { name: string; titleTemplate: string; messageTemplate: string; type: string; linkTemplate: string }> = {
    business_verification_approved: {
        name: 'Business Verification Approved',
        titleTemplate: 'Business Verification Approved',
        messageTemplate: 'Congratulations {{businessName}}! Your business profile verification has been approved. You now have full listing privileges.',
        type: 'business_verification',
        linkTemplate: '/dashboard',
    },
    business_verification_rejected: {
        name: 'Business Verification Rejected',
        titleTemplate: 'Business Verification Rejected',
        messageTemplate: 'Your business profile verification for {{businessName}} has been rejected. Reason: {{rejectionReason}}',
        type: 'business_verification',
        linkTemplate: '/dashboard/settings',
    },
    business_verification_under_review: {
        name: 'Business Verification Under Review',
        titleTemplate: 'Business Verification Under Review',
        messageTemplate: 'Your business profile verification for {{businessName}} is under review and will be processed as soon as possible.',
        type: 'business_verification',
        linkTemplate: '/dashboard',
    },
    admin_business_verification_submitted: {
        name: 'Admin: New Business Verification Submitted',
        titleTemplate: 'New Business Verification Submitted',
        messageTemplate: 'Business account {{businessName}} ({{username}}) has submitted verification details for review.',
        type: 'business_verification',
        linkTemplate: '/team/businesses',
    },
};

/**
 * Seed default templates if they don't exist in DB
 */
export const seedNotificationTemplates = async () => {
    try {
        for (const [code, tpl] of Object.entries(DEFAULT_TEMPLATES)) {
            const exists = await NotificationTemplate.findOne({ code });
            if (!exists) {
                await NotificationTemplate.create({ code, ...tpl });
            }
        }
    } catch (err: any) {
        console.error('Error seeding notification templates:', err.message);
    }
};

/**
 * Render notification title, message, and link from DB template with variables
 */
export const renderNotificationTemplate = async (
    code: string,
    variables: Record<string, string> = {}
): Promise<{ title: string; message: string; type: string; link: string }> => {
    try {
        let tpl = await NotificationTemplate.findOne({ code });
        if (!tpl && DEFAULT_TEMPLATES[code]) {
            tpl = await NotificationTemplate.create({ code, ...DEFAULT_TEMPLATES[code] });
        }

        const titleTemplate = tpl?.titleTemplate || DEFAULT_TEMPLATES[code]?.titleTemplate || 'Notification';
        const messageTemplate = tpl?.messageTemplate || DEFAULT_TEMPLATES[code]?.messageTemplate || '';
        const type = tpl?.type || DEFAULT_TEMPLATES[code]?.type || 'general';
        const linkTemplate = tpl?.linkTemplate || DEFAULT_TEMPLATES[code]?.linkTemplate || '/dashboard';

        let title = titleTemplate;
        let message = messageTemplate;
        let link = linkTemplate;

        for (const [key, val] of Object.entries(variables)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            title = title.replace(regex, val || '');
            message = message.replace(regex, val || '');
            link = link.replace(regex, val || '');
        }

        return { title, message, type, link };
    } catch (err) {
        return {
            title: 'Notification',
            message: 'You have a new notification.',
            type: 'general',
            link: '/dashboard',
        };
    }
};
