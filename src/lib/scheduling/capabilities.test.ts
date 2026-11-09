import { expect, it } from 'vitest';
import { employeeCanWorkPosition } from './capabilities';
const barista = {id:'barista',workspaceId:'w',name:'Barista',active:true,createdAt:'',updatedAt:''};
it('access Lead is not a Barista qualification',()=>{
 expect(employeeCanWorkPosition({employeePositionIds:[],position:barista})).toBe(false);
 expect(employeeCanWorkPosition({employeePositionIds:['barista','cashier'],position:barista})).toBe(true);
 expect(employeeCanWorkPosition({employeePositionIds:['barista'],position:{...barista,active:false}})).toBe(false);
 expect(employeeCanWorkPosition({employeePositionIds:['lead'],position:barista})).toBe(false);
});
