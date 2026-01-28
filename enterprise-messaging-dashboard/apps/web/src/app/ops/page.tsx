'use client';

import { useState } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useDLQJobs,
  useHealth,
  useReplayDLQJob,
  useIgnoreDLQJob,
  type DLQJob,
} from '@/lib/api/ops-hooks';
import { format, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

/**
 * Ops Page - DLQ Viewer & Health Checks
 * Owner-only operational tooling
 */
function OpsContent() {
  const { isOwner } = useAuth();
  const [selectedJob, setSelectedJob] = useState<DLQJob | null>(null);
  const [showReplayDialog, setShowReplayDialog] = useState(false);
  const [showIgnoreDialog, setShowIgnoreDialog] = useState(false);
  const [reason, setReason] = useState('');

  const { data: dlqJobs = [] } = useDLQJobs();
  const { data: health } = useHealth();
  const replayJob = useReplayDLQJob();
  const ignoreJob = useIgnoreDLQJob();

  const handleReplay = async () => {
    if (!selectedJob) return;

    try {
      await replayJob.mutateAsync({
        queueName: selectedJob.queue,
        jobId: selectedJob.id,
        reason: reason || undefined,
      });
      toast.success('Job re-enqueued for retry');
      setShowReplayDialog(false);
      setSelectedJob(null);
      setReason('');
    } catch (error: any) {
      toast.error('Failed to replay job', {
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleIgnore = async () => {
    if (!selectedJob) return;

    try {
      await ignoreJob.mutateAsync({
        queueName: selectedJob.queue,
        jobId: selectedJob.id,
        reason: reason || undefined,
      });
      toast.success('Job archived');
      setShowIgnoreDialog(false);
      setSelectedJob(null);
      setReason('');
    } catch (error: any) {
      toast.error('Failed to ignore job', {
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Access denied. Owner access required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Operations & Monitoring</h1>

        {/* Health Checks */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Provider Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span>{health.provider.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Connected:</span>
                    <Badge variant={health.provider.connected ? 'default' : 'destructive'}>
                      {health.provider.connected ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Received:</span>
                    <span>
                      {health.webhooks.lastReceived
                        ? formatDistanceToNow(health.webhooks.lastReceived, { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Event Type:</span>
                    <span>{health.webhooks.lastEventType || '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Queue Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="font-medium mb-2">Message Retry</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Waiting:</span> {health.queues.messageRetry.waiting}
                      </div>
                      <div>
                        <span className="text-gray-600">Active:</span> {health.queues.messageRetry.active}
                      </div>
                      <div>
                        <span className="text-gray-600">Failed:</span> {health.queues.messageRetry.failed}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Automation</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Waiting:</span> {health.queues.automation.waiting}
                      </div>
                      <div>
                        <span className="text-gray-600">Active:</span> {health.queues.automation.active}
                      </div>
                      <div>
                        <span className="text-gray-600">Failed:</span> {health.queues.automation.failed}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latency:</span>
                    <span>{health.database.latencyMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge
                      variant={
                        health.database.status === 'healthy'
                          ? 'default'
                          : health.database.status === 'degraded'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {health.database.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* DLQ Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Dead Letter Queue</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Failed jobs that exceeded maximum retry attempts
            </p>
          </CardHeader>
          <CardContent>
            {dlqJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No failed jobs</div>
            ) : (
              <div className="space-y-4">
                {dlqJobs.map((job) => (
                  <div key={`${job.queue}-${job.id}`} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{job.name}</div>
                        <div className="text-sm text-gray-600">
                          Queue: {job.queue} • Attempts: {job.attemptsMade}
                        </div>
                      </div>
                      <Badge variant="destructive">Failed</Badge>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      Failed: {format(new Date(job.timestamp), 'PPp')} (
                      {formatDistanceToNow(new Date(job.timestamp), { addSuffix: true })})
                    </div>

                    <div className="text-sm mb-2">
                      <div className="font-medium">Error:</div>
                      <div className="text-red-600 font-mono text-xs bg-red-50 p-2 rounded mt-1">
                        {job.failedReason || 'Unknown error'}
                      </div>
                    </div>

                    {job.entityId && (
                      <div className="text-sm mb-2">
                        <Link
                          href={
                            job.entityType === 'message'
                              ? `/inbox?messageId=${job.entityId}`
                              : `/automations/${job.entityId}/edit`
                          }
                          className="text-blue-600 hover:underline"
                        >
                          View {job.entityType}
                        </Link>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJob(job);
                          setShowReplayDialog(true);
                        }}
                      >
                        Replay
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJob(job);
                          setShowIgnoreDialog(true);
                        }}
                      >
                        Ignore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Replay Dialog */}
      <Dialog open={showReplayDialog} onOpenChange={setShowReplayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replay Job</DialogTitle>
            <DialogDescription>
              Re-enqueue this failed job for retry. The job will be processed again with the same
              parameters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="replay-reason">Reason (Optional)</Label>
              <Textarea
                id="replay-reason"
                placeholder="Enter reason for replaying this job"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReplay} disabled={replayJob.isPending}>
              {replayJob.isPending ? 'Replaying...' : 'Replay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Dialog */}
      <Dialog open={showIgnoreDialog} onOpenChange={setShowIgnoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignore Job</DialogTitle>
            <DialogDescription>
              Archive this failed job. It will be removed from the DLQ and marked as ignored.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ignore-reason">Reason (Optional)</Label>
              <Textarea
                id="ignore-reason"
                placeholder="Enter reason for ignoring this job"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIgnoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleIgnore} disabled={ignoreJob.isPending}>
              {ignoreJob.isPending ? 'Ignoring...' : 'Ignore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OpsPage() {
  return (
    <RequireAuth requireOwner>
      <OpsContent />
    </RequireAuth>
  );
}
