import nextPackage from 'next/package.json';
import reactPackage from 'react/package.json';
export function GET(){return Response.json({fixture:'nevora-fictional-router-control',next:nextPackage.version,react:reactPackage.version});}
