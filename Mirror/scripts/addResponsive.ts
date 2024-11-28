import fs from 'fs';
import path from 'path';

const responsivePatterns = {
  // Layout & Sizing
  'w-\\[40%\\]': 'w-full sm:w-[40%]',
  'w-\\[60%\\]': 'w-full sm:w-[60%]',
  'min-w-\\[500px\\]': 'min-w-full sm:min-w-[500px]',
  'h-\\[982px\\]': 'min-h-[100dvh] sm:h-[982px]',
  'h-32': 'h-24 sm:h-32',
  'h-12': 'h-10 sm:h-12',
  'w-12': 'w-10 sm:w-12',
  
  // Padding & Margin
  'p-6': 'p-4 sm:p-6',
  'p-12': 'p-4 sm:p-12',
  'px-6': 'px-3 sm:px-6',
  'py-6': 'py-3 sm:py-6',
  'mb-4': 'mb-3 sm:mb-4',
  'gap-4': 'gap-2 sm:gap-4',
  
  // Typography
  'text-xl': 'text-lg sm:text-xl',
  'text-2xl': 'text-xl sm:text-2xl',
  'text-3xl': 'text-2xl sm:text-3xl',
  
  // Flex & Grid
  'flex-row': 'flex-col sm:flex-row',
  'grid-cols-2': 'grid-cols-1 sm:grid-cols-2',
  
  // Space
  'space-y-8': 'space-y-4 sm:space-y-8',
};

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find className attributes
  const classNameRegex = /className=["']([^"']+)["']/g;
  
  content = content.replace(classNameRegex, (match, classes) => {
    let newClasses = classes;
    
    // Apply patterns
    Object.entries(responsivePatterns).forEach(([pattern, replacement]) => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'g');
      if (regex.test(newClasses) && !newClasses.includes('sm:')) {
        newClasses = newClasses.replace(regex, replacement);
      }
    });
    
    return `className="${newClasses}"`;
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Processed: ${filePath}`);
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (/\.(tsx|jsx)$/.test(file)) {
      processFile(filePath);
    }
  });
}

// Add to package.json scripts
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.scripts['add-responsive']) {
  packageJson.scripts['add-responsive'] = 'ts-node scripts/addResponsive.ts';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

// Run the script
const srcPath = path.join(process.cwd(), 'src');
walkDir(srcPath); 