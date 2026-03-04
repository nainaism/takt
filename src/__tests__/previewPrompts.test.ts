import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockLoadPieceByIdentifier,
  mockResolvePieceConfigValue,
  mockHeader,
  mockInfo,
  mockError,
  mockBlankLine,
  mockInstructionBuild,
  mockReportBuild,
  mockJudgmentBuild,
} = vi.hoisted(() => ({
  mockLoadPieceByIdentifier: vi.fn(),
  mockResolvePieceConfigValue: vi.fn(),
  mockHeader: vi.fn(),
  mockInfo: vi.fn(),
  mockError: vi.fn(),
  mockBlankLine: vi.fn(),
  mockInstructionBuild: vi.fn(() => 'phase1'),
  mockReportBuild: vi.fn(() => 'phase2'),
  mockJudgmentBuild: vi.fn(() => 'phase3'),
}));

vi.mock('../infra/config/index.js', () => ({
  loadPieceByIdentifier: mockLoadPieceByIdentifier,
  resolvePieceConfigValue: mockResolvePieceConfigValue,
}));

vi.mock('../core/piece/instruction/InstructionBuilder.js', () => ({
  InstructionBuilder: vi.fn().mockImplementation(() => ({
    build: mockInstructionBuild,
  })),
}));

vi.mock('../core/piece/instruction/ReportInstructionBuilder.js', () => ({
  ReportInstructionBuilder: vi.fn().mockImplementation(() => ({
    build: mockReportBuild,
  })),
}));

vi.mock('../core/piece/instruction/StatusJudgmentBuilder.js', () => ({
  StatusJudgmentBuilder: vi.fn().mockImplementation(() => ({
    build: mockJudgmentBuild,
  })),
}));

vi.mock('../core/piece/index.js', () => ({
  needsStatusJudgmentPhase: vi.fn(() => false),
}));

vi.mock('../shared/ui/index.js', () => ({
  header: mockHeader,
  info: mockInfo,
  error: mockError,
  blankLine: mockBlankLine,
}));

import { previewPrompts } from '../features/prompt/preview.js';

describe('previewPrompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvePieceConfigValue.mockImplementation((_: string, key: string) => {
      if (key === 'piece') return undefined;
      if (key === 'language') return 'en';
      return undefined;
    });
    mockLoadPieceByIdentifier.mockReturnValue({
      name: 'default',
      maxMovements: 1,
      movements: [
        {
          name: 'implement',
          personaDisplayName: 'coder',
          outputContracts: [],
        },
      ],
    });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('piece未設定時はDEFAULT_PIECE_NAMEでロードする', async () => {
    await previewPrompts('/project');

    expect(mockLoadPieceByIdentifier).toHaveBeenCalledWith('default', '/project');
  });
});
