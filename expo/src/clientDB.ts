import { init } from "@instantdb/react-native";
import schema from "./instant.schema";

const clientDB = init({
  appId: process.env.NEXT_EXPO_PUBLIC_INSTANT_APP_ID,
  schema,
});

export default clientDB;
