import { db } from './db';

export async function audit(params: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValuesJson: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValuesJson: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (e) {
    console.error('audit log failed', e);
  }
}

export async function notify(params: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type ?? 'info',
        link: params.link,
      },
    });
  } catch (e) {
    console.error('notification failed', e);
  }
}
