# Testing Masked Numbers (Front Desk, Sitter, Pool)

How to test that messaging uses the right numbers for **front desk**, **sitters**, and **pool**, and that **sitters** and **clients** see the correct masked numbers.

---

## Prerequisites

1. **Twilio connected**  
   Setup → Twilio: save Account SID and Auth Token. Status should show **Connected**.

2. **Webhooks installed**  
   Click **Install Webhooks** so inbound SMS hits your app.

3. **At least one number in Twilio**  
   In Twilio Console, buy or use a number. You’ll add it to the app in the next step.

---

## 1. Add numbers in the app (Numbers page)

- Go to **Numbers** (or **Settings** → Numbers / Messaging, depending on your nav).
- **Import** or **Buy** numbers so they appear in your inventory.
- For each number, set **Class**:
  - **Front desk** – main business line (at least one).
  - **Sitter** – dedicated masked number per sitter (one per sitter you want to test).
  - **Pool** – shared numbers for one-off/overflow (optional for basic testing).

You need at least:
- 1× **front_desk**
- 1× **sitter** (to assign to a sitter)

---

## 2. Assign a sitter number (sitter masked number)

- On **Numbers**, find a number with class **Sitter** and status **Active**.
- Use the **Assign to sitter** action and pick a sitter.
- That sitter’s “masked number” for messaging is now this number.

So:
- **Front desk** = the number(s) you marked as front_desk.
- **Sitter masked number** = the sitter-class number assigned to that sitter.

---

## 3. Test outbound: Send Test SMS (Setup page)

- Go to **Setup** (Twilio setup / Messaging setup).
- Use **Send Test SMS**.
- Enter a **destination** (your own phone in E.164, e.g. `+15551234567`).
- Choose **From** (if the UI has it):
  - **Front desk** – sends from your front_desk number.
  - **Sitter** – only works if the test creates/uses a thread that has an active **assignment window** for that sitter (so routing picks the sitter’s masked number). Otherwise the pipeline may use front_desk or pool.
- Send. Check your phone: the **From** should match the number you expect (front_desk vs sitter vs pool).

This confirms:
- **Front desk** outbound works.
- **Sitter** outbound works when the thread has an active assignment window and the sitter has an assigned number.

---

## 4. Test inbound (client texts “you”)

- Use your **personal phone** (or a test number).
- Send an SMS **to** one of your Twilio numbers (the same number you use as front_desk, or a sitter/pool number).
- Your app receives it via the webhook and resolves the **thread** by:
  - **To** number = which number (front_desk / sitter / pool)
  - **From** number = client
- In the app:
  - **Owner inbox** (Messages): you should see the conversation.
  - If the **To** number was a **sitter** number, the thread should be tied to that sitter and appear in that **sitter’s inbox** as well.

So:
- Text to **front_desk** number → thread in owner inbox (and possibly unassigned or later assigned to sitter).
- Text to **sitter** number → thread in owner inbox and in that sitter’s inbox; replies during an active assignment window go from the sitter’s masked number.

---

## 5. Sitter inbox and assignment windows

- **Sitter inbox**: **Sitters** → pick a sitter → **Messages** (or **Inbox**).  
  Only threads where that sitter is assigned (and, where applicable, tied to their masked number) show up.
- **Assignment window**: For a thread to send **from the sitter’s masked number**, the thread must have an **active assignment window** for that sitter (start ≤ now ≤ end).  
  You create assignment windows from:
  - **Assignments** (or equivalent) UI, or
  - The flow that assigns a sitter to a booking/thread.

Test flow:
1. Create or pick a thread.
2. Assign the sitter to that thread and ensure there is an **active** assignment window.
3. As owner or sitter, send a message in that thread.  
   Outbound should use the **sitter’s masked number** (confirm via **Test SMS** or by checking the “from” number in the Messages UI / logs).
4. Have the **client** reply. The reply should land in the same thread and appear in the **sitter’s inbox** and **owner inbox**.

---

## 6. Who sees which number (masking)

- **Client** sees:
  - One number per conversation (the number they texted, or the number replies come from): either **front_desk** or a **sitter** masked number (or pool).
- **Sitter** sees:
  - Their own **masked number** (the sitter-class number assigned to them) used for their assigned threads during the assignment window; they don’t see the client’s real number in the UI if you mask it there (see `maskPhoneNumber` in the codebase).
- **Owner** sees:
  - All threads and, in the UI, can see which number (front_desk / sitter / pool) is used per thread.

So testing “masked numbers” means:
- **Front desk**: one (or more) shared business number(s).
- **Sitter**: each sitter has their own number (sitter-class, assigned to them); clients see that number for that sitter’s conversations.
- **Pool**: shared numbers for specific use (e.g. one-time clients); you test by having a thread that routes to pool and sending/receiving from that number.

---

## 7. Quick checklist

| What you want to test | Where | What to do |
|-----------------------|--------|------------|
| Front desk outbound   | Setup → Send Test SMS (from front_desk) | Send to your phone; check From = front_desk number. |
| Sitter outbound       | Thread with active assignment window + sitter with assigned number | Send message in thread; check From = sitter’s number. Or use Test SMS with fromClass sitter if the test thread is set up that way. |
| Pool outbound         | Thread that uses pool number | Send from that thread; check From = pool number. |
| Inbound to front desk | Your phone → your Twilio front_desk number | Message appears in owner inbox; reply from app uses front_desk. |
| Inbound to sitter     | Your phone → sitter’s Twilio number | Message appears in owner + that sitter’s inbox; reply during window uses sitter masked number. |
| Sitter sees their inbox | Sitters → [Sitter] → Messages | Only their assigned threads; “masked number” there = their sitter number. |
| Client sees one number | Client’s phone | They see the number they text (front_desk or sitter); replies come from that same number. |

---

## 8. Troubleshooting

- **Test SMS fails**  
  Check Setup: Twilio connected, webhooks installed. Ensure you have at least one **front_desk** number in the Numbers page.

- **Sitter send uses front_desk**  
  Thread needs an **active assignment window** for that sitter, and the sitter must have a **sitter-class number assigned** on the Numbers page.

- **Inbound not creating thread**  
  Webhook URL must be set on that Twilio number (Install Webhooks). Check Setup → Copy Setup Diagnostics; `twilioConfiguredUrls` should list your numbers and the webhook URL.

- **Sitter inbox empty**  
  Threads must have `sitterId` set to that sitter (and, for sending from their number, an active assignment window). Check Assignments and the thread’s sitter assignment.
