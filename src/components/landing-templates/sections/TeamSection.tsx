import React from 'react';
import { SectionConfig, TeamSettings, GlobalStyles, TeamVariant } from '@/types/landing-page';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Instagram } from 'lucide-react';
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
  const variant = section.variant as TeamVariant;

  const gridColsClass = 
    settings.columns === 2 ? 'md:grid-cols-2' :
    settings.columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';

  const photoShapeClass = 
    settings.photo_shape === 'circle' ? 'rounded-full' :
    settings.photo_shape === 'rounded' ? 'rounded-xl' : 'rounded-none';

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  // Featured Variant - Main barber larger
  if (variant === 'featured' && staff.length > 1) {
    const [featuredMember, ...restStaff] = staff;
    return (
      <section 
        id="team"
        className="py-16 md:py-24"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

          <div className="max-w-5xl mx-auto">
            {/* Featured Member */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-12 p-8 bg-muted/30 rounded-2xl">
              <div className={cn(
                'w-48 h-48 md:w-64 md:h-64 overflow-hidden flex-shrink-0',
                photoShapeClass
              )}>
                {featuredMember.profiles?.avatar_url ? (
                  <img
                    src={featuredMember.profiles.avatar_url}
                    alt={featuredMember.profiles?.full_name || 'Profissional'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-4xl font-bold">
                    {getInitials(featuredMember.profiles?.full_name)}
                  </div>
                )}
              </div>
              <div className="text-center md:text-left">
                <span 
                  className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: 'var(--landing-accent)', color: 'white' }}
                >
                  Principal
                </span>
                <h3 className="text-2xl md:text-3xl font-bold mb-2">
                  {featuredMember.profiles?.preferred_name || featuredMember.profiles?.full_name || 'Profissional'}
                </h3>
                {settings.show_specialties && featuredMember.specialties?.length > 0 && (
                  <p className="text-muted-foreground mb-3">
                    {featuredMember.specialties.join(' • ')}
                  </p>
                )}
                {settings.show_rating && featuredMember.average_rating && (
                  <div className="flex items-center gap-1 text-yellow-500 mb-3 justify-center md:justify-start">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={cn('h-5 w-5', star <= featuredMember.average_rating ? 'fill-current' : 'fill-none')} 
                      />
                    ))}
                    <span className="ml-2 text-foreground font-medium">{featuredMember.average_rating.toFixed(1)}</span>
                  </div>
                )}
                {settings.show_bio && featuredMember.bio && (
                  <p className="text-muted-foreground max-w-lg">{featuredMember.bio}</p>
                )}
              </div>
            </div>

            {/* Rest of Team */}
            <div className={cn('grid gap-8', gridColsClass)}>
              {restStaff.map((member) => (
                <div key={member.id} className="flex flex-col items-center text-center">
                  <div className={cn('w-24 h-24 overflow-hidden mb-3', photoShapeClass)}>
                    {member.profiles?.avatar_url ? (
                      <img
                        src={member.profiles.avatar_url}
                        alt={member.profiles?.full_name || 'Profissional'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-lg font-bold">
                        {getInitials(member.profiles?.full_name)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold">
                    {member.profiles?.preferred_name || member.profiles?.full_name || 'Profissional'}
                  </h3>
                  {settings.show_specialties && member.specialties?.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {member.specialties.slice(0, 2).join(' • ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Minimal Cards Variant
  if (variant === 'minimal-cards') {
    return (
      <section 
        id="team"
        className="py-16 md:py-24"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

          <div className={cn('grid gap-4', gridColsClass)}>
            {staff.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center gap-4 p-4 bg-background rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className={cn('w-16 h-16 overflow-hidden flex-shrink-0', photoShapeClass)}>
                  {member.profiles?.avatar_url ? (
                    <img
                      src={member.profiles.avatar_url}
                      alt={member.profiles?.full_name || 'Profissional'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-sm font-bold">
                      {getInitials(member.profiles?.full_name)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {member.profiles?.preferred_name || member.profiles?.full_name || 'Profissional'}
                  </h3>
                  {settings.show_specialties && member.specialties?.length > 0 && (
                    <p className="text-sm text-muted-foreground truncate">
                      {member.specialties[0]}
                    </p>
                  )}
                  {settings.show_rating && member.average_rating && (
                    <div className="flex items-center gap-1 text-yellow-500 mt-1">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-xs">{member.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Overlay Variant - Photo with text overlay on hover
  if (variant === 'overlay') {
    return (
      <section 
        id="team"
        className="py-16 md:py-24"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

          <div className={cn('grid gap-6', gridColsClass)}>
            {staff.map((member) => (
              <div 
                key={member.id} 
                className="relative aspect-[3/4] overflow-hidden rounded-xl group cursor-pointer"
              >
                {/* Photo */}
                {member.profiles?.avatar_url ? (
                  <img
                    src={member.profiles.avatar_url}
                    alt={member.profiles?.full_name || 'Profissional'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-4xl font-bold">
                    {getInitials(member.profiles?.full_name)}
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <h3 className="text-white text-xl font-bold mb-1">
                    {member.profiles?.preferred_name || member.profiles?.full_name || 'Profissional'}
                  </h3>

                  {/* Expanded content on hover */}
                  <div className="overflow-hidden max-h-0 group-hover:max-h-40 transition-all duration-300">
                    {settings.show_specialties && member.specialties?.length > 0 && (
                      <p className="text-white/80 text-sm mb-2">
                        {member.specialties.join(' • ')}
                      </p>
                    )}
                    {settings.show_rating && member.average_rating && (
                      <div className="flex items-center gap-1 text-yellow-400 mb-2">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm">{member.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {settings.show_bio && member.bio && (
                      <p className="text-white/70 text-sm line-clamp-2">{member.bio}</p>
                    )}
                    {settings.show_social && member.instagram && (
                      <a 
                        href={`https://instagram.com/${member.instagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mt-2"
                      >
                        <Instagram className="h-4 w-4" />
                        @{member.instagram}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Horizontal Cards Variant
  if (variant === 'cards-horizontal') {
    return (
      <section 
        id="team"
        className="py-16 md:py-24"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

          <div className="max-w-4xl mx-auto space-y-6">
            {staff.map((member) => (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="flex flex-col md:flex-row gap-6 p-0">
                  <div className="md:w-48 h-48 md:h-auto overflow-hidden">
                    {member.profiles?.avatar_url ? (
                      <img
                        src={member.profiles.avatar_url}
                        alt={member.profiles?.full_name || 'Profissional'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-2xl font-bold min-h-[12rem]">
                        {getInitials(member.profiles?.full_name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-6">
                    <h3 className="text-xl font-bold mb-2">
                      {member.profiles?.preferred_name || member.profiles?.full_name || 'Profissional'}
                    </h3>
                    {settings.show_specialties && member.specialties?.length > 0 && (
                      <p className="text-muted-foreground text-sm mb-3">
                        {member.specialties.join(' • ')}
                      </p>
                    )}
                    {settings.show_rating && member.average_rating && (
                      <div className="flex items-center gap-1 text-yellow-500 mb-3">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            className={cn('h-4 w-4', star <= member.average_rating ? 'fill-current' : 'fill-none')} 
                          />
                        ))}
                        <span className="ml-1 text-foreground text-sm">{member.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {settings.show_bio && member.bio && (
                      <p className="text-muted-foreground text-sm">{member.bio}</p>
                    )}
                    {settings.show_social && member.instagram && (
                      <a 
                        href={`https://instagram.com/${member.instagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mt-3 text-sm"
                      >
                        <Instagram className="h-4 w-4" />
                        @{member.instagram}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default variants (grid, carousel, list)
  return (
    <section 
      id="team"
      className="py-16 md:py-24"
      style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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
                <div className={cn('w-32 h-32 md:w-40 md:h-40 overflow-hidden mb-4', photoShapeClass)}>
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
                  <p className="text-sm text-muted-foreground mb-2">{member.specialties.slice(0, 3).join(' • ')}</p>
                )}
                {settings.show_rating && member.average_rating && (
                  <div className="flex items-center gap-1 text-yellow-500 mb-2">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{member.average_rating.toFixed(1)}</span>
                  </div>
                )}
                {settings.show_bio && member.bio && (
                  <p className="text-sm text-muted-foreground max-w-xs">{member.bio}</p>
                )}
                {settings.show_social && member.instagram && (
                  <a 
                    href={`https://instagram.com/${member.instagram}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors mt-3"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {settings.layout === 'carousel' && (
          <div className="flex overflow-x-auto gap-8 pb-4 snap-x snap-mandatory justify-start md:justify-center">
            {staff.map((member) => (
              <div key={member.id} className="flex flex-col items-center text-center min-w-[200px] snap-center">
                <div className={cn('w-32 h-32 md:w-40 md:h-40 overflow-hidden mb-4', photoShapeClass)}>
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
                  <p className="text-sm text-muted-foreground">{member.specialties.slice(0, 2).join(' • ')}</p>
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
                  <div className={cn('w-24 h-24 flex-shrink-0 overflow-hidden', photoShapeClass)}>
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
                      <p className="text-sm text-muted-foreground mb-2">{member.specialties.join(' • ')}</p>
                    )}
                    {settings.show_rating && member.average_rating && (
                      <div className="flex items-center gap-1 text-yellow-500 mb-2">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">{member.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {settings.show_bio && member.bio && (
                      <p className="text-sm text-muted-foreground">{member.bio}</p>
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