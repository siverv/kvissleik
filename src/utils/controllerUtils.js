import { createContext } from "solid-js";

export const QuizState = {
  LOBBY: "LOBBY",
  QUESTION: "QUESTION",
  ALTERNATIVES: "ALTERNATIVES",
  VALIDATION: "VALIDATION",
  STATISTICS: "STATISTICS",
  RESULTS: "RESULTS",
  THE_END: "THE_END"
};

export const Durations = {
  QUESTION: 3 * 1000,
  ALTERNATIVES: 30 * 1000,
  VALIDATION: 60 * 1000,
  STATISTICS: Infinity,
  RESULTS: Infinity
};

export const ControllerContext = createContext(null);