'use client';
import {createContext,useContext,useState,type ReactNode} from 'react';
import {createManagerReviewRecovery} from '@/lib/time-corrections/review-recovery';

const Recovery=createContext<ReturnType<typeof createManagerReviewRecovery>|null>(null);
export function ManagerCorrectionRecoveryBoundary({children}:{children:ReactNode}){
 const [memory]=useState(createManagerReviewRecovery);
 return <Recovery value={memory}>{children}</Recovery>;
}
export function useManagerCorrectionRecovery(){return useContext(Recovery);}
