/**
 * SMS Command Parser
 * 
 * Parses YES/NO commands from SMS messages for offer acceptance/decline.
 */

/**
 * Check if message body matches an ACCEPT command
 */
export function isAcceptCommand(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return normalized === 'YES' || normalized === 'Y' || normalized === 'ACCEPT';
}

/**
 * Check if message body matches a DECLINE command
 */
export function isDeclineCommand(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return normalized === 'NO' || normalized === 'N' || normalized === 'DECLINE';
}

/**
 * Check if message body is a command (YES/NO/ACCEPT/DECLINE)
 */
export function isCommand(body: string): boolean {
  return isAcceptCommand(body) || isDeclineCommand(body);
}
