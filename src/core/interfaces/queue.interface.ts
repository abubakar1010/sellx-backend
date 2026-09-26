export interface JobOptions {
    /** Delay before processing (milliseconds) */
    delay?: number;

    /** Number of retry attempts on failure */
    attempts?: number;

    /** Backoff strategy between retries */
    backoff?: {
        type: 'fixed' | 'exponential';
        delay: number;
    };

    /** Remove job from queue after completion */
    removeOnComplete?: boolean | number;

    /** Remove job from queue after failure */
    removeOnFail?: boolean | number;

    /** Priority (lower = higher priority) */
    priority?: number;
}

export interface BulkJob<T = unknown> {
    name: string;
    data: T;
    options?: JobOptions;
}

export interface IQueueProducer<T = unknown> {
    /**
     * Add a single job to the queue.
     */
    addJob(name: string, data: T, options?: JobOptions): Promise<void>;

    /**
     * Add multiple jobs in a single call.
     */
    addBulk(jobs: BulkJob<T>[]): Promise<void>;
}
