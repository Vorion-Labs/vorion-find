// A ScanContext that collects emitted evidence in memory instead of uploading it.
export function collectingContext(cwd, depth = "standard") {
  const evidence = [];
  const ctx = {
    depth,
    cwd,
    startedAt: Date.now(),
    deadline: Date.now() + 10_000,
    emit: async (batch) => {
      evidence.push(...batch);
    },
    log: () => {},
  };
  return { evidence, ctx };
}
