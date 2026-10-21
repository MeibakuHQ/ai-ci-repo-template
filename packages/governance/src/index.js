/**
 * Continuity assessment and register validators for the light governance scaffold.
 */
export const CUSTODY_STATES = ["unknown", "individual", "institutional"];
export const OPERABILITY_STATES = [
  "missing",
  "documented",
  "exercised",
  "verified",
];

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** True when evidence is marked pass and has not expired. */
export function evidenceIsCurrent(evidence, now = new Date()) {
  if (evidence?.result !== "pass") return false;
  if (!isIsoDate(evidence?.observedAt)) return false;
  if (evidence?.expiresAt) {
    if (!isIsoDate(evidence.expiresAt)) return false;
    if (Date.parse(`${evidence.expiresAt}T23:59:59Z`) < now.getTime()) return false;
  }
  return true;
}

/** Validates docs/governance/authority-map.json shape. */
export function validateFactAuthorityMap(authorityMap) {
  const errors = [];
  if (authorityMap?.schemaVersion !== 1) {
    errors.push("authority-map schemaVersion must equal 1");
  }
  if (!Array.isArray(authorityMap?.factFamilies) || authorityMap.factFamilies.length === 0) {
    errors.push("authority-map requires factFamilies");
  }
  const ids = new Set();
  for (const family of authorityMap?.factFamilies ?? []) {
    if (!family?.id || ids.has(family.id)) {
      errors.push(`duplicate or missing fact family id: ${family?.id ?? "<missing>"}`);
    }
    ids.add(family?.id);
    if (!family?.authority?.path || !family?.authority?.kind) {
      errors.push(`${family?.id}: authority path and kind are required`);
    }
    if (!Array.isArray(family?.consumers)) {
      errors.push(`${family?.id}: consumers must be an array`);
    }
  }
  return errors;
}

/** Validates recovery-sequence.json against optional known service ids. */
export function validateRecoverySequence(sequence, { serviceIds = new Set() } = {}) {
  const errors = [];
  if (sequence?.schemaVersion !== 1) {
    errors.push("recovery sequence schemaVersion must equal 1");
  }
  if (!sequence?.id || !sequence?.scope) {
    errors.push("recovery sequence requires id and scope");
  }
  const ids = new Set();
  for (const step of sequence?.steps ?? []) {
    if (!step.id || ids.has(step.id)) {
      errors.push(`duplicate or missing recovery step id: ${step.id ?? "<missing>"}`);
    }
    ids.add(step.id);
    if (!step.instruction || !step.runbook) {
      errors.push(`recovery step ${step.id} requires instruction and runbook`);
    }
    if (step.serviceId && serviceIds.size > 0 && !serviceIds.has(step.serviceId)) {
      errors.push(`recovery step ${step.id} references unknown service ${step.serviceId}`);
    }
  }
  if ((sequence?.steps?.length ?? 0) === 0) {
    errors.push("recovery sequence requires steps");
  }
  return errors;
}

/** Validates service-catalog.json. */
export function validateServiceCatalog(catalog) {
  const errors = [];
  if (catalog?.schemaVersion !== 1) errors.push("service catalog schemaVersion must equal 1");
  if (!catalog?.scope) errors.push("service catalog requires scope");
  const ids = new Set();
  for (const service of catalog?.services ?? []) {
    if (!service?.id || ids.has(service.id)) {
      errors.push(`duplicate or missing service id: ${service?.id ?? "<missing>"}`);
    }
    ids.add(service?.id);
    if (!service?.name || !service?.ownerRole || !service?.runbook) {
      errors.push(`${service?.id}: name, ownerRole, and runbook are required`);
    }
  }
  if (!Array.isArray(catalog?.services) || catalog.services.length === 0) {
    errors.push("service catalog requires services");
  }
  return errors;
}

/** Validates continuity-register.json structure (not operational readiness). */
export function validateContinuityRegister(register) {
  const errors = [];
  if (register?.schemaVersion !== 1) {
    errors.push("continuity register schemaVersion must equal 1");
  }
  if (!register?.scope) errors.push("continuity register requires scope");
  const capIds = new Set();
  for (const capability of register?.capabilities ?? []) {
    if (!capability?.id || capIds.has(capability.id)) {
      errors.push(`duplicate or missing capability id: ${capability?.id ?? "<missing>"}`);
    }
    capIds.add(capability?.id);
    if (!CUSTODY_STATES.includes(capability?.custodyState)) {
      errors.push(`${capability?.id}: invalid custodyState`);
    }
    if (!OPERABILITY_STATES.includes(capability?.operabilityState)) {
      errors.push(`${capability?.id}: invalid operabilityState`);
    }
    if (!Array.isArray(capability?.evidence) || !Array.isArray(capability?.blockers)) {
      errors.push(`${capability?.id}: evidence and blockers arrays are required`);
    }
  }
  const scenarioIds = new Set();
  for (const scenario of register?.scenarios ?? []) {
    if (!scenario?.id || scenarioIds.has(scenario.id)) {
      errors.push(`duplicate or missing scenario id: ${scenario?.id ?? "<missing>"}`);
    }
    scenarioIds.add(scenario?.id);
    if (!Array.isArray(scenario?.requiredCapabilities)) {
      errors.push(`${scenario?.id}: requiredCapabilities must be an array`);
    }
  }
  if ((register?.capabilities?.length ?? 0) === 0) {
    errors.push("continuity register requires capabilities");
  }
  if ((register?.scenarios?.length ?? 0) === 0) {
    errors.push("continuity register requires scenarios");
  }
  return errors;
}

/** Validates drill-catalog.json. */
export function validateDrillCatalog(catalog) {
  const errors = [];
  if (catalog?.schemaVersion !== 1) errors.push("drill catalog schemaVersion must equal 1");
  const ids = new Set();
  for (const drill of catalog?.drills ?? []) {
    if (!drill?.id || ids.has(drill.id)) {
      errors.push(`duplicate or missing drill id: ${drill?.id ?? "<missing>"}`);
    }
    ids.add(drill?.id);
    if (!drill?.title || !drill?.evidenceType) {
      errors.push(`${drill?.id}: title and evidenceType are required`);
    }
  }
  if (!Array.isArray(catalog?.drills) || catalog.drills.length === 0) {
    errors.push("drill catalog requires drills");
  }
  return errors;
}

/** Scores one continuity scenario without converting known gaps into schema errors. */
export function assessScenario(register, scenarioId, { now = new Date() } = {}) {
  const scenario = register.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error(`Unknown continuity scenario: ${scenarioId}`);
  const capabilities = new Map(
    register.capabilities.map((item) => [item.id, item]),
  );
  const blocking = [];
  const risks = [];

  for (const capabilityId of scenario.requiredCapabilities) {
    const capability = capabilities.get(capabilityId);
    if (!capability) {
      blocking.push(`${capabilityId}: capability is not registered`);
      continue;
    }
    if (
      capability.custodyState === "unknown" ||
      capability.operabilityState === "missing"
    ) {
      blocking.push(
        `${capabilityId}: custody=${capability.custodyState}, operability=${capability.operabilityState}`,
      );
      blocking.push(
        ...capability.blockers.map((item) => `${capabilityId}: ${item}`),
      );
      continue;
    }

    const before = risks.length;
    if (
      CUSTODY_STATES.indexOf(capability.custodyState) <
      CUSTODY_STATES.indexOf(scenario.minimumCustodyState)
    ) {
      risks.push(
        `${capabilityId}: custody ${capability.custodyState} < ${scenario.minimumCustodyState}`,
      );
    }
    if (
      OPERABILITY_STATES.indexOf(capability.operabilityState) <
      OPERABILITY_STATES.indexOf(scenario.minimumOperabilityState)
    ) {
      risks.push(
        `${capabilityId}: operability ${capability.operabilityState} < ${scenario.minimumOperabilityState}`,
      );
    }
    if (
      OPERABILITY_STATES.indexOf(capability.operabilityState) >=
        OPERABILITY_STATES.indexOf("exercised") &&
      !capability.evidence.some((item) => evidenceIsCurrent(item, now))
    ) {
      risks.push(`${capabilityId}: successful evidence is missing or expired`);
    }
    if (risks.length > before) {
      risks.push(
        ...capability.blockers.map((item) => `${capabilityId}: ${item}`),
      );
    }
  }

  return {
    scenario,
    status: blocking.length > 0 ? "blocked" : risks.length > 0 ? "at-risk" : "ready",
    blocking,
    risks,
  };
}

/** Scores all scenarios, or one selected scenario. */
export function assessContinuity(register, { scenarioId, now = new Date() } = {}) {
  const ids = scenarioId
    ? [scenarioId]
    : register.scenarios.map((item) => item.id);
  return ids.map((id) => assessScenario(register, id, { now }));
}

/**
 * Lightweight dependency policy check. Empty/default policy allows all
 * workspace edges; product repos fill runtimeRoots / parkedPackages.
 */
export function evaluateWorkspaceDependencies(policy, workspaces) {
  const byName = new Map(workspaces.map((w) => [w.name, w]));
  const parked = new Set(policy?.parkedPackages ?? []);
  const violations = [];
  const runtimeEdges = [];

  for (const workspace of workspaces) {
    const deps = {
      ...(workspace.dependencies ?? {}),
      ...(workspace.optionalDependencies ?? {}),
      ...(workspace.peerDependencies ?? {}),
    };
    for (const to of Object.keys(deps).sort()) {
      if (!byName.has(to)) continue;
      const classification = parked.has(to) ? "parked" : "active";
      runtimeEdges.push({ from: workspace.name, to, classification });
      if (classification === "parked") {
        violations.push({
          kind: "parked-runtime-dependency",
          from: workspace.name,
          to,
        });
      }
    }
  }

  return { runtimeEdges, violations, ok: violations.length === 0 };
}
