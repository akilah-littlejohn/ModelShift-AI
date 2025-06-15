/**
 * Utility functions for working with JSON paths and dynamic object manipulation
 * Used by the ApiConfiguration system to dynamically insert and extract values
 */

/**
 * Sets a value at a specific JSON path in an object
 * @param obj - The object to modify
 * @param path - The JSON path (e.g., 'messages[0].content', 'parameters.temperature')
 * @param value - The value to set
 * @returns The modified object
 */
export function setValueAtPath(obj: any, path: string, value: any): any {
  if (!path) return obj;
  
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone
  const pathParts = parsePath(path);
  
  let current = result;
  
  // Navigate to the parent of the target location
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    
    if (part.type === 'property') {
      if (!(part.key in current)) {
        // Determine if next part is array or object
        const nextPart = pathParts[i + 1];
        current[part.key] = nextPart.type === 'array' ? [] : {};
      }
      current = current[part.key];
    } else if (part.type === 'array') {
      if (!Array.isArray(current)) {
        throw new Error(`Expected array at path segment, got ${typeof current}`);
      }
      if (current.length <= part.index) {
        // Extend array if necessary
        while (current.length <= part.index) {
          current.push({});
        }
      }
      current = current[part.index];
    }
  }
  
  // Set the final value
  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart.type === 'property') {
    current[lastPart.key] = value;
  } else if (lastPart.type === 'array') {
    if (!Array.isArray(current)) {
      throw new Error(`Expected array at final path segment, got ${typeof current}`);
    }
    current[lastPart.index] = value;
  }
  
  return result;
}

/**
 * Gets a value at a specific JSON path in an object
 * @param obj - The object to read from
 * @param path - The JSON path
 * @returns The value at the path, or undefined if not found
 */
export function getValueAtPath(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  
  const pathParts = parsePath(path);
  let current = obj;
  
  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    if (part.type === 'property') {
      current = current[part.key];
    } else if (part.type === 'array') {
      if (!Array.isArray(current) || current.length <= part.index) {
        return undefined;
      }
      current = current[part.index];
    }
  }
  
  return current;
}

/**
 * Merges an object at a specific JSON path
 * @param obj - The object to modify
 * @param path - The JSON path where to merge
 * @param value - The object to merge
 * @returns The modified object
 */
export function mergeAtPath(obj: any, path: string, value: Record<string, any>): any {
  if (!path) {
    return { ...obj, ...value };
  }
  
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone
  const existing = getValueAtPath(result, path) || {};
  const merged = { ...existing, ...value };
  
  return setValueAtPath(result, path, merged);
}

/**
 * Parses a JSON path string into structured parts
 * @param path - The JSON path string
 * @returns Array of path parts with type information
 */
function parsePath(path: string): Array<{ type: 'property' | 'array'; key?: string; index?: number }> {
  const parts: Array<{ type: 'property' | 'array'; key?: string; index?: number }> = [];
  const segments = path.split('.');
  
  for (const segment of segments) {
    if (segment.includes('[') && segment.includes(']')) {
      // Handle array notation like "messages[0]" or "items[1]"
      const match = segment.match(/^([^[]+)\[(\d+)\]$/);
      if (match) {
        const [, key, indexStr] = match;
        parts.push({ type: 'property', key });
        parts.push({ type: 'array', index: parseInt(indexStr, 10) });
      } else {
        throw new Error(`Invalid array notation in path: ${segment}`);
      }
    } else {
      // Regular property
      parts.push({ type: 'property', key: segment });
    }
  }
  
  return parts;
}

/**
 * Validates that a JSON path is valid for the given object structure
 * @param obj - The object to validate against
 * @param path - The JSON path to validate
 * @returns True if the path is valid, false otherwise
 */
export function isValidPath(obj: any, path: string): boolean {
  try {
    const pathParts = parsePath(path);
    let current = obj;
    
    for (const part of pathParts) {
      if (current === null || current === undefined) {
        return false;
      }
      
      if (part.type === 'property') {
        if (typeof current !== 'object' || !(part.key! in current)) {
          return false;
        }
        current = current[part.key!];
      } else if (part.type === 'array') {
        if (!Array.isArray(current) || current.length <= part.index!) {
          return false;
        }
        current = current[part.index!];
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a sample object structure based on a JSON path
 * Useful for generating example request bodies
 * @param path - The JSON path
 * @param value - The value to place at the path
 * @returns A sample object with the value at the specified path
 */
export function createSampleFromPath(path: string, value: any): any {
  const pathParts = parsePath(path);
  let result: any = {};
  
  // Build the structure from the outside in
  for (let i = pathParts.length - 1; i >= 0; i--) {
    const part = pathParts[i];
    
    if (i === pathParts.length - 1) {
      // Last part - set the actual value
      if (part.type === 'property') {
        result = { [part.key!]: value };
      } else if (part.type === 'array') {
        result = [];
        result[part.index!] = value;
      }
    } else {
      // Intermediate parts - wrap the current result
      if (part.type === 'property') {
        result = { [part.key!]: result };
      } else if (part.type === 'array') {
        const arr: any[] = [];
        arr[part.index!] = result;
        result = arr;
      }
    }
  }
  
  return result;
}