import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    answer_riddle1: v.optional(v.string()),
    answer_riddle2: v.optional(v.string()),
    answer_riddle3: v.optional(v.string()),
    animal: v.string(),
    rsvpd: v.optional(v.boolean()),
  }),
});
