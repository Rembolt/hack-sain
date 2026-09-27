import type { Dispatch } from "react";
import { InfoIcon } from "@/components/icons";
import type { SimulationAssumptions } from "@/simulation/engine";
import { ASSUMPTION_LIMITS } from "@/simulation/engine";
import type { ScenarioAction } from "@/state/scenario-reducer";

const controls: Array<{
  key: keyof SimulationAssumptions;
  label: string;
  description: string;
  step: number;
}> = [
  {
    key: "estimationPreventionRate",
    label: "Estimated-read complaints prevented",
    description: "Better read quality prevents this share of estimated-read complaints.",
    step: 0.01,
  },
  {
    key: "informationDeflectionRate",
    label: "Information-only complaints deflected",
    description: "Clearer bill information resolves eligible demand before a complaint.",
    step: 0.01,
  },
  {
    key: "transferReductionRate",
    label: "Cross-system transfers removed",
    description: "A shared case view reduces transfers among complaints that remain.",
    step: 0.01,
  },
  {
    key: "capacityRecoveryRate",
    label: "Closure capacity recovered",
    description: "Workflow time recovered increases monthly closures only.",
    step: 0.01,
  },
];

export function SimulatorControls({
  assumptions,
  dispatch,
  compact = false,
}: {
  assumptions: SimulationAssumptions;
  dispatch: Dispatch<ScenarioAction>;
  compact?: boolean;
}) {
  return (
    <aside className={`control-panel ${compact ? "compact-controls" : ""}`}>
      <div className="control-panel-header">
        <div><p className="eyebrow">Visible assumptions</p><h3>{compact ? "Interventions" : "Intervention controls"}</h3></div>
      </div>
      <div className="controls-stack">
        {controls.map((control) => {
          const limits = ASSUMPTION_LIMITS[control.key];
          const value = assumptions[control.key];
          const valueId = `${control.key}-value`;
          return (
            <div className="range-control" key={control.key} title={control.description}>
              <div className="range-label-row">
                <label htmlFor={control.key}>{control.label}</label>
                <output id={valueId} htmlFor={control.key}>{Math.round(value * 100)}%</output>
              </div>
              <input
                id={control.key}
                type="range"
                min={limits.min}
                max={limits.max}
                step={control.step}
                value={value}
                aria-describedby={`${control.key}-help ${valueId}`}
                style={{ "--range-position": `${((value - limits.min) / (limits.max - limits.min)) * 100}%` } as React.CSSProperties}
                onChange={(event) =>
                  dispatch({ type: "set", key: control.key, value: Number(event.target.value) })
                }
              />
              <p id={`${control.key}-help`}><InfoIcon />{control.description}</p>
            </div>
          );
        })}
      </div>
      <div className="control-actions">
        <button type="button" className="button-secondary" onClick={() => dispatch({ type: "reset-baseline" })}>{compact ? "Observed baseline" : "Reset to observed baseline"}</button>
        <button type="button" className="button-primary" onClick={() => dispatch({ type: "reset-defaults" })}>{compact ? "Demo defaults" : "Use demo defaults"}</button>
      </div>
    </aside>
  );
}
