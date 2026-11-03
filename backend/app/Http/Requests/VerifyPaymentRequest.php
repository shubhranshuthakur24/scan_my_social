<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class VerifyPaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'razorpay_payment_id' => 'required',
            'razorpay_subscription_id' => 'required',
            'razorpay_signature' => 'required',
            'plan_name' => 'nullable|in:starter,starter_yearly,pro,creator,pro_yearly,creator_yearly',
        ];
    }
}
