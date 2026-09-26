export interface SendMailOptions {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
}

export interface IMailService {
    /**
     * Render an EJS template and send the email.
     * Should NOT throw on failure — log and swallow.
     * Email sending is best-effort (handled by job queue with retries).
     */
    send(options: SendMailOptions): Promise<void>;
}
