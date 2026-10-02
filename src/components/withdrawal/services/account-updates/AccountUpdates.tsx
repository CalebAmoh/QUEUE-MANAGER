import { useState } from 'react';
import { User, Phone, Mail, MapPin, Check, Loader2, ArrowRight, Edit3, Shield } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface UserData {
  name: string;
  account: string;
  balance: number;
}

interface AccountUpdatesProps {
  user: UserData;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

const AccountUpdates: React.FC<AccountUpdatesProps> = ({
  user,
  onComplete,
  onBack,
  onNewTransaction,
  isAssisted
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    phone: '+233 24 123 4567',
    email: 'customer@email.com',
    address: '123 Main Street, Accra, Ghana'
  });

  const [tempData, setTempData] = useState({ ...formData });

  const handleEdit = (field: string) => {
    setEditingField(field);
    setTempData({ ...formData });
  };

  const handleSave = (field: string) => {
    setFormData({ ...formData, [field]: tempData[field as keyof typeof tempData] });
    setEditingField(null);
  };

  const handleCancel = () => {
    setTempData({ ...formData });
    setEditingField(null);
  };

  const handleSubmitChanges = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Left - Success Card */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Account Updated!</h3>
              <p className="text-green-100">
                Your contact information has been updated.
              </p>
            </CardContent>
          </Card>

          {/* Right - Details & Actions */}
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{formData.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{formData.email}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Confirmations sent to your updated email/phone.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <BankingButton variant="outline" size="lg" onClick={onBack} className="flex-1">
                Back to Services
              </BankingButton>
              <BankingButton variant="success" size="lg" onClick={onNewTransaction} className="flex-1">
                Done
                <ArrowRight className="ml-2 h-5 w-5" />
              </BankingButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fields = [
    { key: 'phone', label: 'Phone Number', icon: Phone, type: 'tel' },
    { key: 'email', label: 'Email Address', icon: Mail, type: 'email' },
    { key: 'address', label: 'Address', icon: MapPin, type: 'text' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Landscape Layout - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Header & Info */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Update Account</h2>
              <p className="text-sm text-muted-foreground">Update contact details for {user.name}</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              For security purposes, changes may require additional verification.
            </p>
          </div>

          {/* CRO Instructions */}
          {isAssisted && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs text-blue-700 font-medium text-center">
                CRO: Verify customer identity before updating info. Request valid ID if necessary.
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Form Fields */}
        <div className="space-y-3">
          {fields.map(({ key, label, icon: Icon, type }) => (
            <div key={key} className="bg-muted/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">{label}</Label>
                </div>
                {editingField !== key && (
                  <button
                    onClick={() => handleEdit(key)}
                    className="text-primary hover:text-primary/80 text-xs flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>
              
              {editingField === key ? (
                <div className="space-y-2">
                  <Input
                    type={type}
                    value={tempData[key as keyof typeof tempData]}
                    onChange={(e) => setTempData({ ...tempData, [key]: e.target.value })}
                    className="bg-white h-9"
                  />
                  <div className="flex gap-2">
                    <BankingButton variant="outline" size="sm" onClick={handleCancel}>
                      Cancel
                    </BankingButton>
                    <BankingButton variant="success" size="sm" onClick={() => handleSave(key)}>
                      Save
                    </BankingButton>
                  </div>
                </div>
              ) : (
                <p className="text-foreground text-sm font-medium">{formData[key as keyof typeof formData]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons - Always visible */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <BankingButton variant="outline" size="lg" onClick={onBack}>
          Back to Services
        </BankingButton>
        
        <BankingButton 
          variant="success" 
          size="lg" 
          onClick={handleSubmitChanges}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Confirm Updates
            </>
          )}
        </BankingButton>
      </div>
    </div>
  );
};

export default AccountUpdates;
