"use client";

import { useMemo } from "react";
import { CameraDirector } from "@/components/city-3d/camera-director";
import { CityEnvironment } from "@/components/city-3d/city-environment";
import { ComplaintHouses } from "@/components/city-3d/complaint-houses";
import { ComplaintLinks } from "@/components/city-3d/complaint-links";
import { ResolutionHub } from "@/components/city-3d/resolution-hub";
import { SceneLabelProjector } from "@/components/city-3d/scene-labels";
import {
  buildCityScene,
  FEATURED_TAG_HEIGHT,
  HUB_LABEL_ANCHOR,
} from "@/components/city-3d/scene-model";
import type {
  RegionalCitySceneProps,
  SceneLabelAnchor,
  SceneLabelRefs,
} from "@/components/city-3d/scene-types";

export function RegionalScene({
  houses,
  featuredContext,
  focusFeatured,
  feedbackActive,
  view,
  motion,
  labels,
}: RegionalCitySceneProps & { labels: SceneLabelRefs }) {
  const scene = useMemo(() => buildCityScene(houses, featuredContext), [houses, featuredContext]);
  const anchors = useMemo<SceneLabelAnchor[]>(() => {
    const featured = scene.featuredPosition;
    return [
      { element: labels.hub, position: HUB_LABEL_ANCHOR },
      {
        element: labels.featured,
        position: featured ? [featured[0], FEATURED_TAG_HEIGHT, featured[2]] : null,
      },
    ];
  }, [labels, scene.featuredPosition]);

  return (
    <>
      <CityEnvironment />
      <ResolutionHub view={view} feedbackActive={feedbackActive} motion={motion} />
      <ComplaintLinks links={scene.links} motion={motion} />
      <ComplaintHouses houses={scene.houses} motion={motion} />
      <CameraDirector focus={focusFeatured ? scene.featuredPosition : null} motion={motion} />
      <SceneLabelProjector anchors={anchors} />
    </>
  );
}
