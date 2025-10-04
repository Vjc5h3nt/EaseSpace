
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions";

// Initialize Firebase Admin SDK
initializeApp();

// Define the shape of the data we expect from the client
interface InvitedUserData {
  fullName: string;
  email: string;
  employeeId?: string;
  mobileNumber?: string;
}

/**
 * An onCall HTTPS Cloud Function that:
 * 1. Receives a list of users to invite.
 * 2. Creates each user in Firebase Authentication.
 * 3. Creates a corresponding user document in Firestore.
 * 4. (Simulates) sending a password setup email.
 */
export const bulkInviteUsers = functions.https.onCall(async (data, context) => {
  // Check if the caller is an authenticated admin user.
  if (context.auth?.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Must be an administrative user to perform this action.",
    );
  }

  const usersToInvite: InvitedUserData[] = data.users;
  const orgId: string = context.auth.token.org_id;

  if (!usersToInvite || !Array.isArray(usersToInvite) || !orgId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with an array of 'users' and a valid orgId.",
    );
  }

  const auth = getAuth();
  const db = getFirestore();
  const results = [];

  for (const user of usersToInvite) {
    try {
      // 1. Create the user in Firebase Authentication
      const userRecord = await auth.createUser({
        email: user.email,
        displayName: user.fullName,
        emailVerified: true, // We can set this to true as the invite is trusted
      });

      // 2. Create the user document in Firestore
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        org_id: orgId,
        fullName: user.fullName,
        email: user.email,
        role: "user",
        status: "active", // The user is immediately active
        onboardingComplete: true, // They don't need to go through onboarding
        employeeId: user.employeeId || "",
        mobileNumber: user.mobileNumber || "",
      });

      // 3. Generate a password setup link
      // This link is valid for a short time and can only be used once.
      const setupLink = await auth.generatePasswordResetLink(user.email);

      // 4. Send the welcome email (This is where you'd integrate an email service)
      // For example, using Nodemailer or a service like SendGrid.
      // await sendWelcomeEmail(user.email, user.fullName, setupLink);
      functions.logger.info(`(Simulation) Sent password setup email to: ${user.email} with link: ${setupLink}`);


      results.push({ email: user.email, status: "SUCCESS" });
    } catch (error: any) {
      functions.logger.error(`Failed to invite user ${user.email}:`, error);
      results.push({ email: user.email, status: "ERROR", message: error.message });
    }
  }

  return { results };
});

    