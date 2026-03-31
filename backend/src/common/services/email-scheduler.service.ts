import { emailsService } from '../../modules/emails/emails.service';

class EmailSchedulerService {
    private interval: ReturnType<typeof setInterval> | null = null;
    private running = false;

    start(intervalMs: number = 60 * 1000) {
        if (this.interval) return;
        this.runCycle();
        this.interval = setInterval(() => {
            void this.runCycle();
        }, intervalMs);
        console.log(`📨 Email scheduler started — checking every ${intervalMs / 1000}s`);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('📨 Email scheduler stopped');
        }
    }

    private async runCycle() {
        if (this.running) return;
        this.running = true;
        try {
            await emailsService.sendDueScheduledDrafts();
        } finally {
            this.running = false;
        }
    }
}

export const emailScheduler = new EmailSchedulerService();
