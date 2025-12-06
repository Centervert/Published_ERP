import { useState, useCallback, useMemo } from 'react';
import type { EmailBlock } from '@/types/email-blocks';
import {
  moveBlock,
  updateBlock,
  deleteBlock,
  duplicateBlock,
  insertBlock,
  createBlock,
} from '@/lib/block-utils';

interface HistoryState {
  past: EmailBlock[][];
  present: EmailBlock[];
  future: EmailBlock[][];
}

interface UseBlockEditorOptions {
  initialBlocks?: EmailBlock[];
  maxHistoryLength?: number;
}

export function useBlockEditor(options: UseBlockEditorOptions = {}) {
  const { initialBlocks = [], maxHistoryLength = 50 } = options;

  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialBlocks,
    future: [],
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const blocks = history.present;

  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    return blocks.find((b) => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // Push new state to history
  const pushState = useCallback((newBlocks: EmailBlock[]) => {
    setHistory((prev) => ({
      past: [...prev.past, prev.present].slice(-maxHistoryLength),
      present: newBlocks,
      future: [],
    }));
  }, [maxHistoryLength]);

  // Set blocks without history (for initial load)
  const setBlocks = useCallback((newBlocks: EmailBlock[]) => {
    setHistory({
      past: [],
      present: newBlocks,
      future: [],
    });
    setSelectedBlockId(null);
  }, []);

  // Undo
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = prev.past.slice(0, -1);
      const newPresent = prev.past[prev.past.length - 1];
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const newFuture = prev.future.slice(1);
      const newPresent = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  // Can undo/redo
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Move block
  const handleMoveBlock = useCallback((fromIndex: number, toIndex: number) => {
    const newBlocks = moveBlock(blocks, fromIndex, toIndex);
    pushState(newBlocks);
  }, [blocks, pushState]);

  // Update block
  const handleUpdateBlock = useCallback((blockId: string, updates: Partial<EmailBlock>) => {
    const newBlocks = updateBlock(blocks, blockId, updates);
    pushState(newBlocks);
  }, [blocks, pushState]);

  // Delete block
  const handleDeleteBlock = useCallback((blockId: string) => {
    const newBlocks = deleteBlock(blocks, blockId);
    pushState(newBlocks);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [blocks, pushState, selectedBlockId]);

  // Duplicate block
  const handleDuplicateBlock = useCallback((blockId: string) => {
    const newBlocks = duplicateBlock(blocks, blockId);
    pushState(newBlocks);
  }, [blocks, pushState]);

  // Add block
  const handleAddBlock = useCallback(<T extends EmailBlock['type']>(
    type: T,
    index?: number,
    overrides?: Partial<Extract<EmailBlock, { type: T }>>
  ) => {
    const newBlock = createBlock(type, overrides);
    const insertIndex = index ?? blocks.length;
    const newBlocks = insertBlock(blocks, newBlock, insertIndex);
    pushState(newBlocks);
    setSelectedBlockId(newBlock.id);
    return newBlock;
  }, [blocks, pushState]);

  // Select block
  const handleSelectBlock = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedBlockId(null);
  }, []);

  return {
    // State
    blocks,
    selectedBlockId,
    selectedBlock,
    isDragging,

    // History
    canUndo,
    canRedo,
    undo,
    redo,

    // Actions
    setBlocks,
    moveBlock: handleMoveBlock,
    updateBlock: handleUpdateBlock,
    deleteBlock: handleDeleteBlock,
    duplicateBlock: handleDuplicateBlock,
    addBlock: handleAddBlock,
    selectBlock: handleSelectBlock,
    clearSelection,
    setIsDragging,
  };
}
