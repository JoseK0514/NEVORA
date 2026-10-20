"use server";
import {redirect} from 'next/navigation';
/** Retired ID/phone form. No proof, credential write or automatic login is accepted here. */
export async function activateAccountAction(_formData:FormData):Promise<never> {
 redirect('/activate');
}
