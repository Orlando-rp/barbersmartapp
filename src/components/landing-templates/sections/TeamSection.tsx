import React from 'react';
import { SectionConfig, TeamSettings, GlobalStyles } from '@/types/landing-page';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Instagram, Facebook } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamSectionProps {
  section: SectionConfig;
  globalStyles: GlobalStyles;
  staff: any[];
  isPreview?: boolean;
}

export const TeamSection: React.FC<TeamSectionProps> = ({
  section,
  globalStyles,
  staff,
  isPreview,
}) => {
  const settings = section.settings as TeamSettings;
  const variant = section.variant;

  const gridColsClass = 
    settings.columns === 2 ? 'md:grid-cols-2' :
    settings.columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';

  const photoShapeClass = 
    settings.photo_shape === 'circle' ? 'rounded-full' :
    settings.photo_shape === 'rounded' ? 'rounded-xl' : 'rounded-none';

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  return (
    <section 
      id="team"
      className="py-16 md:py-24"
      style={{ 
        backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined 
      }}
    >
      <div className="container mx-auto px-4">
        {section.title && (
          <h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ fontFamily: 'var(--landing-font-heading)' }}
          >
            {section.title}
          </h2>
        )}

        {settings.layout === 'grid' && (
          <div className={cn('grid gap-8', gridColsClass)}>
            {staff.map((member) => (
              <div key={member.id} className="flex flex-col items-center text-center">
                <div className={cn(
                  'w-32 h-32 md:w-40 md:h-40 overflow-hidden mb-4',
                  photoShapeClass
                )}>
                  {member.profiles?.avatar_url ? (
                    <img
                      src={member.profiles.avatar_url}
                      alt={member.profiles?.full_name || 'Profissional'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-2xl font-bold">
                      {getInitials(member.profiles?.full_name)}
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-semibold mb-1">
                  {member.profiles?.preferred_name || member.profiles?.full_name || 'Profissional'}
                </h3>

                {settings.show_specialties && member.specialties?.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {member.specialties.slice(0, 3).join(' • ')}
                  </p>
                )}

                {settings.show_rating && member.average_rating && (
                  <div className="flex items-center gap-1 text-yellow-500 mb-2">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{member.average_rating.toFixed(1)}</span>
                  </div>
                )}

                {settings.show_bio && member.bio && (
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {member.bio}
                  </p>
                )}

                {settings.show_social && (
                  <div className="flex gap-3 mt-3">
                    {member.instagram && (
                      <a 
                        href={`https://instagram.com/${member.instagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {settings.layout === 'carousel' && (
          <div className="flex overflow-x-auto gap-8 pb-4 snap-x snap-mandatory justify-start md:justify-center">
            {staff.map((member) => (
              <div 
                key={member.id} 
                className="flex flex-col items-center text-center min-w-[200px] snap-center"
              >
                <div className={cn(
                  'w-32 h-32 md:w-40 md:h-40 overflow-hidden mb-4',
                  photoShapeClass
                )}>
                  {member.profiles?.avatar_url ? (
                    <img
                      src={member.profiles.avatar_url}
                      alt={member.profiles?.full_name || 'Profissional'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-2xl font-bold">
                      {getInitials(member.profiles?.full_name)}
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-semibold mb-1">
                  {member.profiles?.preferred_name || member.profiles?.full_name || 'Profissional'}
                </h3>

                {settings.show_specialties && member.specialties?.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {member.specialties.slice(0, 2).join(' • ')}
                  </p>
                )}

                {settings.show_rating && member.average_rating && (
                  <div className="flex items-center gap-1 text-yellow-500 mt-2">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{member.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {settings.layout === 'list' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {staff.map((member) => (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="flex gap-6 p-6">
                  <div className={cn(
                    'w-24 h-24 flex-shrink-0 overflow-hidden',
                    photoShapeClass
                  )}>
                    {member.profiles?.avatar_url ? (
                      <img
                        src={member.profiles.avatar_url}
                        alt={member.profiles?.full_name || 'Profissional'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-xl font-bold">
                        {getInitials(member.profiles?.full_name)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">
                      {member.profiles?.preferred_name || member.profiles?.full_name || 'Profissional'}
                    </h3>

                    {settings.show_specialties && member.specialties?.length > 0 && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {member.specialties.join(' • ')}
                      </p>
                    )}

                    {settings.show_rating && member.average_rating && (
                      <div className="flex items-center gap-1 text-yellow-500 mb-2">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">{member.average_rating.toFixed(1)}</span>
                      </div>
                    )}

                    {settings.show_bio && member.bio && (
                      <p className="text-sm text-muted-foreground">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
