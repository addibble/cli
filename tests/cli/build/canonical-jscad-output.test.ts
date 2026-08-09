import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import type { CircuitJson } from "circuit-json"
import { writeGlbFromCircuitJson } from "cli/build/worker-output-generators"

test("CLI GLB output renders canonical assembly JSCAD plans", async () => {
  const outputDir = mkdtempSync(path.join(tmpdir(), "tsci-jscad-"))
  const outputPath = path.join(outputDir, "3d.glb")
  const circuitJson: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_assembly_device",
      source_assembly_device_id: "assembly_1",
      name: "canonical-enclosure-test",
    },
    {
      type: "source_board",
      source_board_id: "source_board_1",
      source_group_id: "source_group_1",
    },
    {
      type: "source_fdm_enclosure",
      source_fdm_enclosure_id: "enclosure_1",
      source_assembly_device_id: "assembly_1",
      source_board_id: "source_board_1",
      wall_thickness: 2,
    },
    {
      type: "cad_fdm_enclosure",
      cad_fdm_enclosure_id: "cad_case_base",
      source_fdm_enclosure_id: "enclosure_1",
      name: "case-base",
      enclosure_part: "base",
      position: { x: 0, y: 0, z: -2 },
      model_jscad: { type: "cuboid", size: [24, 14, 4] },
      model_unit_to_mm_scale_factor: 1,
    },
  ]

  try {
    await writeGlbFromCircuitJson(circuitJson, outputPath)
    expect(readFileSync(outputPath).byteLength).toBeGreaterThan(1000)
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
})
