// --- DELETE AFTER TEST -------------------------------------------------
// Hardcoded account so you can click through home, forms, search, and settings.
// Delete this file, then delete every block marked DELETE AFTER TEST.
export const TEST_USER = {
  name: "Test",
  email: "test@northwind.ca",
  password: "test",
  title: "Test admin",
  phone: "",
};

export function isTestUser(email: string) {
  return email.trim().toLowerCase() === TEST_USER.email;
}
// --- END DELETE AFTER TEST ---------------------------------------------
