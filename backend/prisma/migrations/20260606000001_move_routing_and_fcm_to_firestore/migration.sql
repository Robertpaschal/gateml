-- RoutingConfig and fcmToken moved to Firestore.
-- RoutingConfig lives at routingConfig/{userId} in Firestore.
-- FCM tokens live at userSettings/{userId}.fcmToken in Firestore (Admin SDK only).

DROP TABLE IF EXISTS "RoutingConfig";

ALTER TABLE "User" DROP COLUMN IF EXISTS "fcmToken";
