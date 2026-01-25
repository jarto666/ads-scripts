import { atomWithStorage } from "jotai/utils";

export interface ProjectGenSettings {
  scriptsPerAngle: number;
  platform: string;
  angles: string[];
  durations: number[];
  personaIds: string[];
  quality: "standard" | "premium";
}

const DEFAULT_GEN_SETTINGS: ProjectGenSettings = {
  scriptsPerAngle: 3,
  platform: "universal",
  angles: ["pain_agitation", "objection_reversal", "problem_solution"],
  durations: [15, 30],
  personaIds: [],
  quality: "standard",
};

// Creates a per-project atom stored in localStorage
export function createProjectGenSettingsAtom(projectId: string) {
  return atomWithStorage<ProjectGenSettings>(
    `project-gen-settings-${projectId}`,
    DEFAULT_GEN_SETTINGS
  );
}

// Store atoms by project ID to reuse them
const projectAtomsCache = new Map<
  string,
  ReturnType<typeof createProjectGenSettingsAtom>
>();

export function getProjectGenSettingsAtom(projectId: string) {
  if (!projectAtomsCache.has(projectId)) {
    projectAtomsCache.set(projectId, createProjectGenSettingsAtom(projectId));
  }
  return projectAtomsCache.get(projectId)!;
}
