

## Plan: Verify and Fix End-to-End Booking Flow

After reviewing the codebase, the core flow is already implemented. Here's the current state and what needs fixing:

### What Already Works
- **Stripe checkout** creates a session and redirects to `checkout.stripe.com`
- **verify-payment** edge function creates the booking, marks the slot as booked, and records the payment
- **BookingDetailsModal** already has a "Join Call"/"Start Call" button for virtual sessions and a Chat tab for messaging
- **Both dashboards** (client `Dashboard.tsx` and `AdvisorDashboard.tsx`) show upcoming bookings with "View Details" that opens the modal

### What Needs to Be Done

**1. Test with Stripe test card (4242 4242 4242 4242)**
- Complete a payment on the Stripe checkout page using test mode
- Verify the `verify-payment` function successfully creates the booking and payment records

**2. Fix AdvisorDashboard VideoCall props**
- The `AdvisorDashboard` currently only passes `bookingId` and `onClose` to `VideoCall`. While props are optional, passing `advisorId`, `clientId`, and `advisorName` would enable the post-call review prompt and better UX. Will add these props from the selected booking data.

**3. Add "Join Call" button directly on booking cards (both dashboards)**
- Currently users must click "View Details" → then "Join Call" inside the modal. For sessions happening today, add a prominent "Join Call" button directly on the booking card for quicker access.

**4. For in-person bookings, ensure the Chat tab is prominently surfaced**
- The Chat tab already exists in `BookingDetailsModal` for all non-cancelled bookings
- Add a visual indicator on booking cards when there are unread messages, and for in-person bookings show "Chat to arrange meeting point" guidance text

**5. Ensure booking cards distinguish virtual vs in-person**
- Update booking card icons: show `Video` icon for virtual, `MapPin` icon for in-person
- For in-person bookings, replace "Join Call" with "Open Chat" button

### Implementation Steps

1. **Update `AdvisorDashboard.tsx`**: Pass full booking data to `VideoCall`, add direct "Join Call"/"Open Chat" buttons on booking cards
2. **Update `Dashboard.tsx` (client)**: Add direct "Join Call"/"Open Chat" buttons on upcoming booking cards, distinguish virtual vs in-person
3. **Update `BookingDetailsModal.tsx`**: Add guidance text for in-person bookings in the Chat tab ("Use this chat to arrange your meeting location")
4. **Test end-to-end**: Complete a test payment and verify the booking appears on both dashboards with correct actions

