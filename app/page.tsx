"use client";

import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { api } from "../convex/_generated/api";

type Step =
  | "welcome"
  | "riddle_1"
  | "meet_hosts"
  | "riddle_main"
  | "main_details"
  | "riddle_dessert"
  | "dessert_details"
  | "success";

type State = { step: Step };

type Event =
  | { type: "RSVP_CLICKED" }
  | { type: "RIDDLE_1_SUBMITTED" }
  | { type: "GO_TO_MAIN" }
  | { type: "RIDDLE_MAIN_SUBMITTED" }
  | { type: "GO_TO_DESSERT" }
  | { type: "RIDDLE_DESSERT_SUBMITTED" }
  | { type: "COMPLETE_RSVP" };

function reducer(state: State, event: Event): State {
  switch (state.step) {
    case "welcome": {
      if (event.type === "RSVP_CLICKED") return { step: "riddle_1" };
      return state;
    }
    case "riddle_1": {
      if (event.type === "RIDDLE_1_SUBMITTED") return { step: "meet_hosts" };
      return state;
    }
    case "meet_hosts": {
      if (event.type === "GO_TO_MAIN") return { step: "riddle_main" };
      return state;
    }
    case "riddle_main": {
      if (event.type === "RIDDLE_MAIN_SUBMITTED")
        return { step: "main_details" };
      return state;
    }
    case "main_details": {
      if (event.type === "GO_TO_DESSERT") return { step: "riddle_dessert" };
      return state;
    }
    case "riddle_dessert": {
      if (event.type === "RIDDLE_DESSERT_SUBMITTED")
        return { step: "dessert_details" };
      return state;
    }
    case "dessert_details": {
      if (event.type === "COMPLETE_RSVP") return { step: "success" };
      return state;
    }
    case "success": {
      return state;
    }
  }
}

const ROMAN = ["I", "II", "III", "IV", "V"] as const;

function actForStep(step: Step): (typeof ROMAN)[number] {
  const actIndex = (() => {
    switch (step) {
      case "welcome":
      case "riddle_1":
        return 0;
      case "meet_hosts":
      case "riddle_main":
      case "main_details":
        return 1;
      case "riddle_dessert":
      case "dessert_details":
        return 2;
      case "success":
        return 3;
    }
  })();
  return ROMAN[actIndex];
}

function progressForStep(step: Step) {
  const act = actForStep(step);
  const actIndex = ROMAN.indexOf(act);
  return (actIndex + 1) / ROMAN.length;
}

function RiddleDialog({
  title,
  riddle,
  onSubmit,
}: {
  title: string;
  riddle: string;
  onSubmit: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="riddle-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-black/40 p-6 shadow-2xl">
        <h2
          id="riddle-title"
          className="font-serif text-2xl font-semibold leading-tight text-zinc-50"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300/80">
          {riddle}
        </p>

        <label className="mt-5 block text-xs font-medium uppercase tracking-[0.22em] text-zinc-300/70">
          Your Answer
          <input
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-zinc-50 outline-none placeholder:text-zinc-500"
          />
        </label>

        {error ? (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              if (!answer.trim()) {
                setError("Please enter an answer to continue.");
                return;
              }
              onSubmit(answer.trim());
            }}
            className="h-12 rounded-full border border-[#c8a24e]/55 bg-black/30 px-6 text-sm font-medium tracking-wide text-zinc-50 shadow-[0_0_0_1px_rgba(200,162,78,0.08),0_16px_40px_rgba(0,0,0,0.6)] hover:border-[#c8a24e]/80 hover:bg-black/40"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-black/30 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-[0.32em] text-zinc-300/60">
        {label}
      </div>
      <div className="mt-4 font-serif text-4xl leading-tight text-zinc-50">
        {value}
      </div>
    </div>
  );
}

function PillButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-14 w-full rounded-full border border-[#c8a24e]/55 bg-black/30 px-8 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-50 shadow-[0_0_0_1px_rgba(200,162,78,0.08),0_30px_80px_rgba(0,0,0,0.7)] hover:border-[#c8a24e]/80 hover:bg-black/40"
    >
      {label}
    </button>
  );
}

function PageContents() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("user")?.trim() ?? "";
  useEffect(() => {
    if (!userId) router.replace("/?user=guest");
  }, [router, userId]);

  const userDoc = useQuery(api.users.getById, { id: userId });
  const setRsvpd = useMutation(api.users.setRsvpd);
  const setRiddleAnswer = useMutation(api.users.setRiddleAnswer);
  const displayName = userDoc?.name ?? userId;

  const [{ step }, dispatch] = useReducer(reducer, { step: "welcome" });
  const hasUpdatedRsvp = useRef(false);
  const act = actForStep(step);
  const progress = progressForStep(step);

  useEffect(() => {
    if (step !== "success" || !userId || hasUpdatedRsvp.current) return;
    hasUpdatedRsvp.current = true;
    void setRsvpd({ id: userId, rsvpd: true });
  }, [setRsvpd, step, userId]);

  const isLoadingUser = userDoc === undefined;

  const primaryCta = useMemo(() => {
    switch (step) {
      case "welcome":
        return {
          label: "RSVP Now",
          action: () => dispatch({ type: "RSVP_CLICKED" }),
        };
      case "meet_hosts":
        return {
          label: "Go to main course",
          action: () => dispatch({ type: "GO_TO_MAIN" }),
        };
      case "main_details":
        return {
          label: "Go to desert",
          action: () => dispatch({ type: "GO_TO_DESSERT" }),
        };
      case "dessert_details":
        return {
          label: "Complete RSVP",
          action: () => dispatch({ type: "COMPLETE_RSVP" }),
        };
      default:
        return null;
    }
  }, [step]);

  const screenCopy = useMemo(() => {
    switch (step) {
      case "welcome":
      case "riddle_1":
        return {
          headline: `Welcome ${displayName} to an Evening with Des & Bob`,
          lede: "A South African safari. Minus the danger. Plus the steak.",
          body: "Tomahawk confidence. Linen outfits. Absolutely no wildlife involvement."
        }
      case "meet_hosts":
      case "riddle_main":
        return {
          headline: "Meet the Hosts",
          lede: "Behind every elegant evening is a team of professionals. Behind this one is Luc & Bruce, which is similar, but significantly louder.",
          body: "Our culinary training is both extensive and conveniently unverifiable. We have watched documentaries, owned at least one expensive knife, and once said “rest the meat” with the confidence of people who meant it.",
        };
      case "main_details":
        return {
  headline: "Main course",
  lede: "Thoughtfully prepared. Confidently presented.",
  body: "Savory, assured, and not open for discussion."
};
      case "riddle_dessert":
      case "dessert_details":
       return {
  headline: "Dessert",
  lede: "We didn’t have to do this.",
  body: "But here we are."
};
      case "success":
        return {
          headline: "RSVP complete",
          lede: "You’re in. Your table is calling.",
          body: "Congratulations. You have survived the riddles.",
        };
      default:
        return {
          headline: `Welcome ${displayName} to an evening with Des & Bob`,
          lede: "A South African safari evening, in a private-club tone we have not earned.",
          body: "Lantern vibes. Linen energy. Zero actual wildlife.",
        };
    }
  }, [displayName, step]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0b0b] text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,214,130,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.05),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.20),rgba(0,0,0,0.85))]" />

      {isLoadingUser ? (
        <main className="relative mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
          <div className="text-center">
            <div className="text-xs font-medium uppercase tracking-[0.35em] text-zinc-300/70">
              Preparing the evening
            </div>
            <div className="mt-4 font-serif text-3xl tracking-tight text-zinc-50">
              Setting your place
            </div>
            <div className="mt-6 h-px w-40 bg-white/10">
              <div className="h-px w-2/3 bg-[#c8a24e]/80" />
            </div>
          </div>
        </main>
      ) : (
        <main className="relative mx-auto w-full max-w-md px-6 pb-20 pt-14">
        <header>
          <div className="text-xs font-medium uppercase tracking-[0.35em] text-zinc-300/70">
            An Evening
          </div>
          <div className="mt-2 font-serif text-2xl tracking-tight text-zinc-50">
            Des &amp; Bob
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-sm text-zinc-300/70">
              <div>
                Act {act} of {ROMAN.length}
              </div>
              <div>Theme: South African Safari.</div>
            </div>
            <div className="mt-4 h-px w-full bg-white/10">
              <div
                className="h-px bg-[#c8a24e]/80"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </header>

        <section className="mt-10">
          <div className="text-xs font-medium uppercase tracking-[0.35em] text-zinc-300/70">
            Act {act}
          </div>

          <p className="mt-10 font-serif text-4xl leading-[1.06] tracking-tight text-zinc-50">
            {screenCopy.headline}
          </p>

          <p className="mt-4 text-lg leading-8 text-zinc-300/85">
            {screenCopy.lede}
          </p>

          <p className="mt-6 text-base leading-7 text-zinc-300/70">
            {screenCopy.body}
          </p>

        {step === "meet_hosts" ? (
          <div className="mt-10 space-y-6">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                <img
                  src="/luc.png"
                  alt="Luc"
                  className="h-auto w-full"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-300/60">
                Des
              </p>
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                <img
                  src="/bruce.png"
                  alt="Bruce"
                  className="h-auto w-full"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-300/60">
                Bob
              </p>
            </div>
          ) : null}

          {step === "main_details" ? (
            <div className="mt-10">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                <img
                  src="/main.png"
                  alt="Main course"
                  className="h-auto w-full"
                />
              </div>
            </div>
          ) : null}

          {step === "dessert_details" ? (
            <div className="mt-10">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                <img
                  src="/starter.png"
                  alt="Dessert course"
                  className="h-auto w-full"
                />
              </div>
            </div>
          ) : null}
        </section>

        {step === "welcome" ? (
          <section className="mt-10 border-t border-white/10 pt-8">
            <div className="space-y-5">
              <InfoCard label="Theme" value="South African" />
              <InfoCard label="Dress Code" value="Safari" />
              <InfoCard label="Date" value="Tonight" />
            </div>
          </section>
        ) : null}

        <section className="mt-10">
          {step === "success" ? (
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-black/30 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur">
              <div className="text-xs font-medium uppercase tracking-[0.32em] text-zinc-300/60">
                Assigned Animal
              </div>
              <div className="mt-4 font-serif text-4xl leading-tight text-zinc-50">
                {userDoc?.animal ?? "unknown"}
              </div>
            </div>
          ) : primaryCta ? (
            <PillButton label={primaryCta.label} onClick={primaryCta.action} />
          ) : null}
        </section>
        </main>
      )}

      {step === "riddle_1" ? (
        <RiddleDialog
          title="Riddle 1"
          riddle="Named a tongue, carved from the seat, Sour-bathed, I hold no heat. Shrinking as the breezes blow, I turn to stone, dark and slow."
          onSubmit={(answer) => {
            if (!userId) return;
            void setRiddleAnswer({
              id: userId,
              riddle: "answer_riddle1",
              answer,
            });
            dispatch({ type: "RIDDLE_1_SUBMITTED" });
          }}
        />
      ) : null}

      {step === "riddle_main" ? (
        <RiddleDialog
          title="Main course riddle"
          riddle="I have a handle, but I open no door. I look like a weapon, but I’m not used for war."
          onSubmit={(answer) => {
            if (!userId) return;
            void setRiddleAnswer({
              id: userId,
              riddle: "answer_riddle2",
              answer,
            });
            dispatch({ type: "RIDDLE_MAIN_SUBMITTED" });
          }}
        />
      ) : null}

      {step === "riddle_dessert" ? (
        <RiddleDialog
          title="Dessert riddle"
          riddle="I am a golden-collared cow trembling beneath a bark that holds no bite."
          onSubmit={(answer) => {
            if (!userId) return;
            void setRiddleAnswer({
              id: userId,
              riddle: "answer_riddle3",
              answer,
            });
            dispatch({ type: "RIDDLE_DESSERT_SUBMITTED" });
          }}
        />
      ) : null}
    </div>
  );
}

export default function Home() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  }
  const convex = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);

  return (
    <ConvexProvider client={convex}>
      <Suspense fallback={<div className="min-h-screen bg-[#0b0b0b]" />}>
        <PageContents />
      </Suspense>
    </ConvexProvider>
  );
}
