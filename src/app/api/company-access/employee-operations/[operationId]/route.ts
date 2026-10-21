import {employeeOperationHttp} from '@/lib/company-access/employee-operation-http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{operationId:string}>}){return employeeOperationHttp(request,(await params).operationId);}
