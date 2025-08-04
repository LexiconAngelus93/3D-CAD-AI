import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CADEngine } from '../engine/CADEngine';
import { AIEngine } from '../ai/AIEngine';
import { PCBEngine } from '../pcb/PCBEngine';
import { SchematicEngine } from '../pcb/SchematicEngine';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { Scene, PerspectiveCamera } from 'three';

export interface AppState {
  selectedTool: string;
  selectedObjects: string[];
  viewMode: 'modeling' | 'pcb' | 'simulation' | 'schematic';
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  isLoading: boolean;
  error: string | null;
  currentProject: string | null;
  recentProjects: string[];
}

interface AppContextType {
  appState: AppState;
  cadEngine: CADEngine;
  aiEngine: AIEngine;
  pcbEngine: PCBEngine;
  schematicEngine: SchematicEngine;
  simulationEngine: SimulationEngine;
  selectTool: (tool: string) => void;
  selectObjects: (objectIds: string[]) => void;
  setViewMode: (mode: 'modeling' | 'pcb' | 'simulation' | 'schematic') => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createNewProject: (name: string) => void;
  openProject: (projectId: string) => void;
  saveProject: () => void;
}

type AppAction =
  | { type: 'SELECT_TOOL'; payload: string }
  | { type: 'SELECT_OBJECTS'; payload: string[] }
  | { type: 'SET_VIEW_MODE'; payload: 'modeling' | 'pcb' | 'simulation' | 'schematic' }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'SET_GRID_SIZE'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CREATE_PROJECT'; payload: string }
  | { type: 'OPEN_PROJECT'; payload: string }
  | { type: 'ADD_RECENT_PROJECT'; payload: string };

const initialState: AppState = {
  selectedTool: 'select',
  selectedObjects: [],
  viewMode: 'modeling',
  showGrid: true,
  snapToGrid: true,
  gridSize: 1.0,
  isLoading: false,
  error: null,
  currentProject: null,
  recentProjects: []
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.payload };
    case 'SELECT_OBJECTS':
      return { ...state, selectedObjects: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };
    case 'TOGGLE_SNAP':
      return { ...state, snapToGrid: !state.snapToGrid };
    case 'SET_GRID_SIZE':
      return { ...state, gridSize: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CREATE_PROJECT':
      return { 
        ...state, 
        currentProject: action.payload,
        recentProjects: [action.payload, ...state.recentProjects.filter(p => p !== action.payload)].slice(0, 10)
      };
    case 'OPEN_PROJECT':
      return { 
        ...state, 
        currentProject: action.payload,
        recentProjects: [action.payload, ...state.recentProjects.filter(p => p !== action.payload)].slice(0, 10)
      };
    case 'ADD_RECENT_PROJECT':
      return {
        ...state,
        recentProjects: [action.payload, ...state.recentProjects.filter(p => p !== action.payload)].slice(0, 10)
      };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, dispatch] = useReducer(appReducer, initialState);

  // Initialize engines
  const scene = new Scene();
  const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  const cadEngine = new CADEngine(scene, camera);
  const aiEngine = new AIEngine(cadEngine);
  const pcbEngine = new PCBEngine(scene);
  const schematicEngine = new SchematicEngine(scene);
  const simulationEngine = new SimulationEngine(scene);

  useEffect(() => {
    const initializeEngines = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        await cadEngine.initialize();
        await aiEngine.initialize();
        await pcbEngine.initialize();
        await schematicEngine.initialize();
        await simulationEngine.initialize();
        
        console.log('All engines initialized successfully');
      } catch (error) {
        console.error('Failed to initialize engines:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize application engines' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeEngines();

    // Cleanup on unmount
    return () => {
      cadEngine.dispose();
      aiEngine.dispose();
      pcbEngine.dispose();
      schematicEngine.dispose();
      simulationEngine.dispose();
    };
  }, []);

  // Action creators
  const selectTool = (tool: string) => {
    dispatch({ type: 'SELECT_TOOL', payload: tool });
  };

  const selectObjects = (objectIds: string[]) => {
    dispatch({ type: 'SELECT_OBJECTS', payload: objectIds });
    // Update engine selection
    cadEngine.selectObjects(objectIds);
  };

  const setViewMode = (mode: 'modeling' | 'pcb' | 'simulation' | 'schematic') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
    
    // Switch engine contexts based on view mode
    switch (mode) {
      case 'modeling':
        // Show CAD objects, hide PCB/simulation objects
        break;
      case 'pcb':
        // Show PCB objects, hide others
        break;
      case 'schematic':
        // Show schematic objects
        break;
      case 'simulation':
        // Show simulation results
        break;
    }
  };

  const toggleGrid = () => {
    dispatch({ type: 'TOGGLE_GRID' });
  };

  const toggleSnap = () => {
    dispatch({ type: 'TOGGLE_SNAP' });
  };

  const setGridSize = (size: number) => {
    dispatch({ type: 'SET_GRID_SIZE', payload: size });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const createNewProject = (name: string) => {
    const projectId = `project_${Date.now()}`;
    dispatch({ type: 'CREATE_PROJECT', payload: projectId });
    
    // Initialize new project in engines
    cadEngine.clear();
    // Clear other engines as needed
  };

  const openProject = (projectId: string) => {
    dispatch({ type: 'OPEN_PROJECT', payload: projectId });
    
    // Load project data into engines
    // This would load from storage in a real implementation
  };

  const saveProject = () => {
    if (!appState.currentProject) return;
    
    try {
      // Save project data from all engines
      const projectData = {
        cad: cadEngine.exportToJSON(),
        // Add other engine data as needed
      };
      
      // Save to storage (localStorage, server, etc.)
      localStorage.setItem(`project_${appState.currentProject}`, JSON.stringify(projectData));
      
      console.log('Project saved successfully');
    } catch (error) {
      console.error('Failed to save project:', error);
      setError('Failed to save project');
    }
  };

  const contextValue: AppContextType = {
    appState,
    cadEngine,
    aiEngine,
    pcbEngine,
    schematicEngine,
    simulationEngine,
    selectTool,
    selectObjects,
    setViewMode,
    toggleGrid,
    toggleSnap,
    setGridSize,
    setLoading,
    setError,
    createNewProject,
    openProject,
    saveProject
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

