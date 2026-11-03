<?php

namespace App\Services\Validation\FormatValidators;

use Illuminate\Contracts\Support\Arrayable;

class ValidationResult implements Arrayable
{
    public function __construct(
        protected bool $isValid,
        protected ?string $message = null,
        protected ?string $errorCode = null,
        protected array $mediaErrors = [],
        protected array $extraData = []
    ) {}

    public static function pass(): self
    {
        return new self(true);
    }

    public static function fail(string $message, string $errorCode, array $mediaErrors = [], array $extraData = []): self
    {
        return new self(false, $message, $errorCode, $mediaErrors, $extraData);
    }

    public function isValid(): bool
    {
        return $this->isValid;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }

    public function getMediaErrors(): array
    {
        return $this->mediaErrors;
    }

    public function toArray(): array
    {
        if ($this->isValid) {
            return ['valid' => true];
        }

        $payload = [
            'message' => $this->message,
            'code' => $this->errorCode,
        ];

        if (!empty($this->mediaErrors)) {
            $payload['errors'] = [
                'media' => $this->mediaErrors,
            ];
        }

        if (!empty($this->extraData)) {
            $payload = array_merge($payload, $this->extraData);
        }

        return $payload;
    }
}
