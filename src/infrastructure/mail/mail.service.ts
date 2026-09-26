import ejs from 'ejs';
import path from 'node:path';

import { config } from '@/config';
import { logger } from '../logger/winston.logger';
import { mailTransporter } from './mail.transport';
import type { IMailService, SendMailOptions } from '@/core/interfaces/mail.interface';

const templatesRoot = path.resolve(process.cwd(), 'templates', 'email');

const resolveTemplatePath = (template: string): string => {
    const normalized = template.endsWith('.ejs') ? template : `${template}.ejs`;
    return path.resolve(templatesRoot, normalized);
};

export class MailService implements IMailService {
    async send(options: SendMailOptions): Promise<void> {
        try {
            const templatePath = resolveTemplatePath(options.template);
            const templateContext = {
                ...options.context,
                appName: config.app.name,
            };
            const templateContent = await ejs.renderFile(templatePath, templateContext);
            
            // Check if template uses layout
            if (templateContent.includes('<% layout(') || templateContent.includes('<%- body %>')) {
                // Extract layout information and body from template
                const layoutMatch = templateContent.match(/<%\s*layout\(['"]([^'"]+)['"]\)\s*-\?%>/);
                const bodyMatch = templateContent.match(/<%\s*-\s*body\s*-\?%>/);
                
                if (layoutMatch && bodyMatch) {
                    const layoutName = layoutMatch[1];
                    const body = bodyMatch[0];
                    
                    // Extract variables from template
                    const subjectMatch = templateContent.match(/<%\s*subject\s*=\s*['"]([^'"]+)['"]\s*-\?%>/);
                    const preheaderMatch = templateContent.match(/<%\s*preheader\s*=\s*['"]([^'"]+)['"]\s*-\?%>/);
                    const titleMatch = templateContent.match(/<%\s*title\s*=\s*['"]([^'"]+)['"]\s*-\?%>/);
                    const subtitleMatch = templateContent.match(/<%\s*subtitle\s*=\s*['"]([^'"]+)['"]\s*-\?%>/);
                    const bodyContentMatch = templateContent.match(/<%\s*body\s*=\s*`([\s\S]*?)`\s*-\?%>/);
                    
                    // Prepare context for layout
                    const layoutContext = {
                        ...options.context,
                        subject: subjectMatch ? subjectMatch[1] : options.subject,
                        preheader: preheaderMatch ? preheaderMatch[1] : '',
                        title: titleMatch ? titleMatch[1] : '',
                        subtitle: subtitleMatch ? subtitleMatch[1] : '',
                        body: bodyContentMatch ? bodyContentMatch[1] : '',
                    };
                    
                    // Render the layout
                    const layoutPath = resolveTemplatePath(`layouts/${layoutName}`);
                    const html = await ejs.renderFile(layoutPath, layoutContext);
                    
                    await mailTransporter.sendMail({
                        from: config.mail.from,
                        to: options.to,
                        subject: layoutContext.subject,
                        html,
                    });
                } else {
                    // If template has body but no layout, render as is
                    await mailTransporter.sendMail({
                        from: config.mail.from,
                        to: options.to,
                        subject: options.subject,
                        html: templateContent,
                    });
                }
            } else {
                // If no layout, render template as is
                await mailTransporter.sendMail({
                    from: config.mail.from,
                    to: options.to,
                    subject: options.subject,
                    html: templateContent,
                });
            }
        } catch (error) {
            logger.error('Failed to send email', {
                to: options.to,
                subject: options.subject,
                template: options.template,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

export const mailService = new MailService();
