import { useMemo } from "react";
import { buildDuckVariant } from "../lib/raceUtils.js";
import LazyRaceArena from "./LazyRaceArena.jsx";

export default function RaceArena({ racers, progress, placements, isRacing, showBurst, countdownValue, audience, avatarSeed }) {
  const variants = useMemo(() => racers.map((name) => buildDuckVariant(name, avatarSeed)), [racers, avatarSeed]);
  return (
    <LazyRaceArena
      racers={racers}
      progress={progress}
      placements={placements}
      isRacing={isRacing}
      showBurst={showBurst}
      countdownValue={countdownValue}
      audience={audience}
      variants={variants}
    />
  );
}
