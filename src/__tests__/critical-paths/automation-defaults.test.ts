import { describe, it, expect } from 'vitest';
import { getDefaultAutomationSettings, AUTOMATION_TYPE_IDS } from '@/lib/automations/types';

describe('Automation defaults', () => {
  it('all automations default to enabled', () => {
    const settings = getDefaultAutomationSettings();
    for (const id of AUTOMATION_TYPE_IDS) {
      expect(settings[id].enabled).toBe(true);
    }
  });

  it('has exactly 6 automation types', () => {
    expect(AUTOMATION_TYPE_IDS).toHaveLength(6);
  });

  it('booking confirmation sends to client by default', () => {
    const settings = getDefaultAutomationSettings();
    expect(settings.bookingConfirmation.sendToClient).toBe(true);
  });

  it('night before reminder sends to both client and sitter', () => {
    const settings = getDefaultAutomationSettings();
    expect(settings.nightBeforeReminder.sendToClient).toBe(true);
    expect(settings.nightBeforeReminder.sendToSitter).toBe(true);
  });

  it('sitter assignment notifies both sitter and owner', () => {
    const settings = getDefaultAutomationSettings();
    expect(settings.sitterAssignment.sendToSitter).toBe(true);
    expect(settings.sitterAssignment.sendToOwner).toBe(true);
  });
});
