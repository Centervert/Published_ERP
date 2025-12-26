import { Company } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Building2, Edit, Globe, Phone, MapPin } from 'lucide-react';

interface CompanyCardProps {
  company: Company;
  onEdit: () => void;
}

export function CompanyCard({ company, onEdit }: CompanyCardProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-4">
        {/* Logo/Icon */}
        {company.icon_url ? (
          <img 
            src={company.icon_url} 
            alt={company.name} 
            className="h-10 w-10 object-contain rounded"
          />
        ) : company.logo_url ? (
          <img 
            src={company.logo_url} 
            alt={company.name} 
            className="h-10 max-w-[100px] object-contain"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
        )}
        
        {/* Name */}
        <div>
          <h3 className="font-medium">{company.name}</h3>
          {company.tagline && (
            <p className="text-sm text-muted-foreground">{company.tagline}</p>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block h-8 w-px bg-border mx-2" />

        {/* Quick info */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {company.website_url && (
            <a 
              href={company.website_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{company.website_url.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {company.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.legal_address && (
            <div className="flex items-center gap-1.5 max-w-[200px]">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{company.legal_address}</span>
            </div>
          )}
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>
    </div>
  );
}
