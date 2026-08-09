import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import type { CircuitJson } from "circuit-json"
import { writeGlbFromCircuitJson } from "cli/build/worker-output-generators"

const readPositionSize = (glb: Uint8Array): [number, number, number] => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
  expect(view.getUint32(0, true)).toBe(0x46546c67) // "glTF"
  const jsonLength = view.getUint32(12, true)
  const json = JSON.parse(
    new TextDecoder().decode(
      new Uint8Array(glb.buffer, glb.byteOffset + 20, jsonLength),
    ),
  )
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const mesh of json.meshes ?? [])
    for (const primitive of mesh.primitives ?? []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION]
      if (!accessor?.min || !accessor?.max) continue
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis]!, accessor.min[axis])
        max[axis] = Math.max(max[axis]!, accessor.max[axis])
      }
    }
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
}

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
    const glb = readFileSync(outputPath)
    expect(glb.byteLength).toBeGreaterThan(1000)
    // Circuit XYZ maps to glTF X/Y/Z as X/Z/Y. These dimensions exceed the
    // 20x1.6x10 board on every axis and therefore disappear if the converter
    // silently drops cad_fdm_enclosure records.
    const size = readPositionSize(glb)
    expect(size[0]).toBeCloseTo(24)
    expect(size[1]).toBeCloseTo(4)
    expect(size[2]).toBeCloseTo(14)
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
})
