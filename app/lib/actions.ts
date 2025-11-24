'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.'
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than 0.' }),
    status: z.enum(['pending', 'paid'], { invalid_type_error: 'Please select an invoice status.' }),
    date: z.string(),
})

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
    errors?: {
        customerId?: string[],
        amount?: string[],
        status?: string[],
    };
    message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
    const rawFormData = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    }
    const validatedFields = CreateInvoice.safeParse(rawFormData);

    //if form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields. Failed to Create Invoice.'
        }
    }
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        //insert validated data into database
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;
    } catch (e) {
        console.error(e);
        return { message: 'Database Error: Failed to Create Invoice' }
    }


    //revalidate the path, so cache is cleared and fresh data is fetched
    revalidatePath('/dashboard/invoices');

    //redirect to dashboard/invoices.
    //redirect would only be reachable if try is successful
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
    const rawFormData = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    }
    const validatedFields = UpdateInvoice.safeParse(rawFormData);
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields. Failed to Create Invoice.'
        }
    }
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    try {
    //update invoices table with the validated data
    await sql`
        UPDATE invoices 
        SET customer_id = ${customerId}, amount = ${amountInCents}, status =  ${status}, date = ${date}
        WHERE id = ${id}`;
    } catch (e) {
        console.error(e);
        return { message: 'Database Error: Failed to Update Invoice' }
    }

    //revalidate the path, so cache is cleared and fresh data is fetched
    revalidatePath('/dashboard/invoices');

    //redirect to dashboard/invoices
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    // try {
    //delete invoice from the invoices table
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    // } catch (e) {
    //     console.error(e);
    //     return { message: 'Database Error: Failed to Delete Invoice' }
    // }
    //revalidate the path, so cache is cleared and fresh data is fetched
    revalidatePath('/dashboard/invoices');
}

export async function authenticate(
    prevState:string | undefined,
    formData: FormData
) {
    try{
        await signIn('credentials', formData);
    }catch(e){
        if(e instanceof AuthError){
            switch(e.type){
                case 'CredentialsSignin':
                    return 'Invalid credentials';
                default:
                    return 'Something went wrong';
            }
        }
        throw e;
    }
}