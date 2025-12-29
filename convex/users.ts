import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getById = query({
  args: { id: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.string(),
      answer_riddle1: v.optional(v.string()),
      answer_riddle2: v.optional(v.string()),
      answer_riddle3: v.optional(v.string()),
      rsvpd: v.optional(v.boolean()),
      animal: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("users", args.id);
    if (!id) return null;
    return await ctx.db.get(id);
  },
});

export const setRsvpd = mutation({
  args: { id: v.string(), rsvpd: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("users", args.id);
    if (!id) return null;
    await ctx.db.patch(id, { rsvpd: args.rsvpd });
    return null;
  },
});

export const setRiddleAnswer = mutation({
  args: {
    id: v.string(),
    riddle: v.union(
      v.literal("answer_riddle1"),
      v.literal("answer_riddle2"),
      v.literal("answer_riddle3"),
    ),
    answer: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("users", args.id);
    if (!id) return null;
    const user = await ctx.db.get(id);
    if (!user) return null;
    if (args.riddle === "answer_riddle1" && user.rsvpd) return null;
    if (user[args.riddle]) return null;
    await ctx.db.patch(id, { [args.riddle]: args.answer });
    return null;
  },
});
