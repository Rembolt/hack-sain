import { analyticsProvider } from "@/integrations/analytics-provider";
import {
  assertPlaybackTimeline,
  type PlaybackInput,
  type PlaybackProvider,
} from "@/integrations/playback-contracts";
import { createReferencePlaybackProvider } from "@/integrations/reference-playback-provider";

// Integration seam: the teammate's learning model replaces this reference
// provider by implementing PlaybackProvider and populating the model fields.
export const playbackProvider: PlaybackProvider =
  createReferencePlaybackProvider(analyticsProvider);

export function buildPlaybackTimeline(input: PlaybackInput) {
  return assertPlaybackTimeline(playbackProvider.buildTimeline(input));
}
