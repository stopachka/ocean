import { init } from "@instantdb/react-native";
import schema from "./instant.schema";

const clientDB = init({
  appId: "efc5d4a0-64e9-4da4-9e8d-fc5fe7d638e1",
  schema,
});

export default clientDB;
