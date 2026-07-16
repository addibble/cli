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
      type: "source_component",
      ftype: "simple_chip",
      source_component_id: "source_case_base",
      name: "case-base",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_case_base",
      source_component_id: "source_case_base",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 0,
      height: 0,
      do_not_place: true,
      is_allowed_to_be_off_board: true,
      obstructs_within_bounds: false,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_case_base",
      source_component_id: "source_case_base",
      pcb_component_id: "pcb_case_base",
      position: { x: 0, y: 0, z: -2 },
      model_jscad: { type: "cuboid", size: [24, 14, 4] },
      model_object_fit: "contain_within_bounds",
      anchor_alignment: "center",
    },
  ]

  try {
    await writeGlbFromCircuitJson(circuitJson, outputPath)
    expect(readFileSync(outputPath).byteLength).toBeGreaterThan(1000)
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
})
